"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/marketing/admin-auth";
import {
  importHugoFromUrl,
  resolveUrlCard as resolveUrlCardInternal,
} from "@/lib/marketing/content-import";
import {
  getCampaignById,
  getCampaignRunById,
  getLatestCampaignRunByCampaignId,
} from "@/lib/marketing/repository";
import { resolveRecipientsBySegments } from "@/lib/marketing/segments";
import { sendMarketingEmail } from "@/lib/marketing/send";
import { CAMPAIGN_TYPES, SEGMENT_KEYS } from "@/lib/marketing/types";
import type {
  CampaignInput,
  CampaignRunRecord,
  CampaignRunRecipientRecord,
  CampaignType,
  CreateRunInput,
  LocaleCode,
  SegmentKey,
} from "@/lib/marketing/types";

const SEGMENT_SET = new Set<string>(SEGMENT_KEYS);
const CAMPAIGN_TYPE_SET = new Set<string>(CAMPAIGN_TYPES);

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://app.dataviz.jp";
}

function parseSegmentKeys(input: string[]): SegmentKey[] {
  return input.filter((key): key is SegmentKey => SEGMENT_SET.has(key));
}

function parseCampaignType(input: string | null | undefined): CampaignType | null {
  if (!input) return null;
  return CAMPAIGN_TYPE_SET.has(input) ? (input as CampaignType) : null;
}

function ensureCampaignInput(input: CampaignInput): string | null {
  const campaignType = parseCampaignType(input.campaignType);
  if (!campaignType) return "メール種別の指定が不正です";
  if (!input.title?.trim()) return "管理用タイトルを入力してください";
  if (!input.emailTitleJa?.trim() || !input.emailTitleEn?.trim()) {
    return "メールタイトル（日本語・英語）を入力してください";
  }
  if (!input.newsletterLabelJa?.trim() || !input.newsletterLabelEn?.trim()) {
    return "ヘッダー文言（日本語・英語）を入力してください";
  }
  if (!input.subjectJa?.trim() || !input.subjectEn?.trim()) {
    return "件名（日本語・英語）を入力してください";
  }
  if (!input.bodyMdJa?.trim() || !input.bodyMdEn?.trim()) {
    return "本文（日本語・英語）を入力してください";
  }
  const keys = parseSegmentKeys(input.segmentKeys ?? []);
  if (campaignType === "marketing" && keys.length === 0) {
    return "配信セグメントを1つ以上選択してください";
  }
  return null;
}

function revalidateCampaignPaths(campaignId: string) {
  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${campaignId}`);
  revalidatePath(`/admin/emails/${campaignId}/edit`);
  revalidatePath(`/admin/emails/${campaignId}/preview`);
  revalidatePath(`/admin/emails/${campaignId}/test`);
  revalidatePath(`/admin/emails/${campaignId}/queue`);
  revalidatePath(`/admin/emails/${campaignId}/recipients`);
}

async function ensurePreferenceForUser(userId: string, locale: LocaleCode) {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_email_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: created, error: insertError } = await adminDb
    .from("marketing_email_preferences")
    .insert({
      user_id: userId,
      locale,
      marketing_opt_in: true,
    })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created;
}

function getLocalizedCampaignContent(
  campaign: {
    subject_ja: string;
    subject_en: string;
    body_md_ja: string;
    body_md_en: string;
    newsletter_label_ja: string;
    newsletter_label_en: string;
    helper_text_ja: string;
    helper_text_en: string;
    email_title_ja: string;
    email_title_en: string;
    title: string;
  },
  locale: LocaleCode
) {
  if (locale === "en") {
    const emailTitle =
      campaign.email_title_en?.trim() || campaign.email_title_ja?.trim() || campaign.title;
    return {
      subject: campaign.subject_en,
      bodyMarkdown: campaign.body_md_en,
      newsletterLabel: campaign.newsletter_label_en,
      helperText: campaign.helper_text_en,
      title: emailTitle,
    };
  }
  const emailTitle =
    campaign.email_title_ja?.trim() || campaign.email_title_en?.trim() || campaign.title;
  return {
    subject: campaign.subject_ja,
    bodyMarkdown: campaign.body_md_ja,
    newsletterLabel: campaign.newsletter_label_ja,
    helperText: campaign.helper_text_ja,
    title: emailTitle,
  };
}

async function countRunRecipients(runId: string, status?: "pending" | "sent" | "failed" | "skipped") {
  const adminDb = createAdminClient();
  let query = adminDb
    .from("marketing_campaign_run_recipients")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function syncCampaignSnapshotFromRun(run: CampaignRunRecord) {
  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from("marketing_campaigns")
    .update({
      status: run.status,
      queued_at: run.queued_at,
      started_at: run.started_at,
      completed_at: run.completed_at,
      total_count: run.total_count,
      sent_count: run.sent_count,
      failed_count: run.failed_count,
      last_error: run.last_error,
    })
    .eq("id", run.campaign_id);
  if (error) throw error;
}

async function refreshRunAggregate(runId: string): Promise<{
  run: CampaignRunRecord;
  retryableCount: number;
}> {
  const run = await getCampaignRunById(runId);
  if (!run) {
    throw new Error("Runが見つかりません");
  }

  const [total, sent, failed, pending, skipped] = await Promise.all([
    countRunRecipients(runId),
    countRunRecipients(runId, "sent"),
    countRunRecipients(runId, "failed"),
    countRunRecipients(runId, "pending"),
    countRunRecipients(runId, "skipped"),
  ]);

  const retryableCount = pending + failed;
  const nextStatus: CampaignRunRecord["status"] =
    retryableCount === 0 ? "completed" : pending === 0 ? "failed" : "sending";

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaign_runs")
    .update({
      status: nextStatus,
      total_count: total,
      sent_count: sent,
      failed_count: failed,
      skipped_count: skipped,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", runId)
    .select("*")
    .single();
  if (error) throw error;

  const updatedRun = data as CampaignRunRecord;
  await syncCampaignSnapshotFromRun(updatedRun);

  return {
    run: updatedRun,
    retryableCount,
  };
}

async function listPreviouslySentTargets(campaignId: string): Promise<{
  userIds: Set<string>;
  emails: Set<string>;
}> {
  const adminDb = createAdminClient();

  const [newRes, legacyRes] = await Promise.all([
    adminDb
      .from("marketing_campaign_run_recipients")
      .select("user_id, email")
      .eq("campaign_id", campaignId)
      .eq("status", "sent"),
    adminDb
      .from("marketing_campaign_recipients")
      .select("user_id, email")
      .eq("campaign_id", campaignId)
      .eq("status", "sent"),
  ]);

  if (newRes.error) throw newRes.error;
  if (legacyRes.error) throw legacyRes.error;

  const userIds = new Set<string>();
  const emails = new Set<string>();

  for (const row of [...(newRes.data ?? []), ...(legacyRes.data ?? [])]) {
    if (row.user_id) {
      userIds.add(row.user_id);
    }
    if (row.email) {
      emails.add(String(row.email).trim().toLowerCase());
    }
  }

  return { userIds, emails };
}

export async function saveCampaign(input: CampaignInput) {
  const admin = await requireAdminForAction();
  const errorMessage = ensureCampaignInput(input);
  if (errorMessage) {
    return { success: false as const, error: errorMessage };
  }
  const campaignType = parseCampaignType(input.campaignType);
  if (!campaignType) {
    return { success: false as const, error: "メール種別の指定が不正です" };
  }

  const adminDb = createAdminClient();
  const segmentKeys = parseSegmentKeys(input.segmentKeys);
  const effectiveSegments = campaignType === "marketing" ? segmentKeys : [];
  const effectiveAutoSendEnabled =
    campaignType === "account_created" ? !!input.autoSendEnabled : false;

  const payload = {
    title: input.title.trim(),
    email_title_ja: input.emailTitleJa.trim(),
    email_title_en: input.emailTitleEn.trim(),
    auto_send_enabled: effectiveAutoSendEnabled,
    campaign_type: campaignType,
    segment_keys: effectiveSegments,
    newsletter_label_ja: input.newsletterLabelJa.trim(),
    newsletter_label_en: input.newsletterLabelEn.trim(),
    helper_text_ja: input.helperTextJa.trim(),
    helper_text_en: input.helperTextEn.trim(),
    subject_ja: input.subjectJa.trim(),
    subject_en: input.subjectEn.trim(),
    body_md_ja: input.bodyMdJa.trim(),
    body_md_en: input.bodyMdEn.trim(),
  };

  if (input.id) {
    const existing = await getCampaignById(input.id);
    if (!existing) {
      return { success: false as const, error: "メールが見つかりません" };
    }
    if (existing.status === "queued" || existing.status === "sending") {
      return { success: false as const, error: "配信中のメールは編集できません" };
    }
    if (effectiveAutoSendEnabled && !existing.test_sent_at) {
      return {
        success: false as const,
        error: "自動送信を有効化する前にテスト送信を実行してください",
      };
    }

    if (effectiveAutoSendEnabled) {
      const { error: disableError } = await adminDb
        .from("marketing_campaigns")
        .update({
          auto_send_enabled: false,
        })
        .eq("campaign_type", "account_created")
        .eq("auto_send_enabled", true);
      if (disableError) {
        return { success: false as const, error: disableError.message };
      }
    }

    const { error } = await adminDb
      .from("marketing_campaigns")
      .update({
        ...payload,
        status: "draft",
      })
      .eq("id", input.id);

    if (error) {
      return { success: false as const, error: error.message };
    }

    revalidateCampaignPaths(input.id);
    return { success: true as const, campaignId: input.id };
  }

  if (effectiveAutoSendEnabled) {
    return {
      success: false as const,
      error: "自動送信の有効化は作成後にテスト送信を実行してから行ってください",
    };
  }

  const { data, error } = await adminDb
    .from("marketing_campaigns")
    .insert({
      ...payload,
      created_by: admin.id,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) {
    return { success: false as const, error: error?.message ?? "作成に失敗しました" };
  }

  revalidatePath("/admin/emails");
  return { success: true as const, campaignId: data.id };
}

export async function importHugoContent(url: string) {
  await requireAdminForAction();
  try {
    const result = await importHugoFromUrl(url);
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "取り込みに失敗しました",
    };
  }
}

export async function resolveUrlCard(url: string) {
  await requireAdminForAction();
  try {
    const result = await resolveUrlCardInternal(url);
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "URLカードの取得に失敗しました",
    };
  }
}

export async function sendCampaignTest(
  campaignId: string,
  toEmail: string,
  locale: LocaleCode = "ja"
) {
  await requireAdminForAction();
  const email = toEmail.trim();
  if (!email || !email.includes("@")) {
    return { success: false as const, error: "テスト送信先メールアドレスが不正です" };
  }

  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false as const, error: "メールが見つかりません" };
  }

  const content = getLocalizedCampaignContent(campaign, locale);
  if (!content.subject.trim() || !content.bodyMarkdown.trim()) {
    return { success: false as const, error: "件名または本文が空です" };
  }

  const unsubscribeUrl = `${baseUrl()}/api/emails/unsubscribe?token=${randomUUID()}`;

  try {
    const { messageId } = await sendMarketingEmail({
      to: email,
      title: content.title,
      newsletterLabel: content.newsletterLabel,
      helperText: content.helperText,
      subject: content.subject,
      bodyMarkdown: content.bodyMarkdown,
      unsubscribeUrl,
      locale,
    });

    const adminDb = createAdminClient();
    const { error } = await adminDb
      .from("marketing_campaigns")
      .update({
        test_sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
    if (error) throw error;

    revalidateCampaignPaths(campaignId);

    return { success: true as const, messageId };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "テスト送信に失敗しました",
    };
  }
}

export async function createCampaignRun(campaignId: string, input: CreateRunInput = {}) {
  const admin = await requireAdminForAction();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false as const, error: "メールが見つかりません" };
  }
  if (campaign.campaign_type === "account_created") {
    return {
      success: false as const,
      error: "この種別のメールはキュー実行できません",
    };
  }
  if (!campaign.test_sent_at) {
    return { success: false as const, error: "先にテスト送信を実行してください" };
  }
  if (campaign.status === "sending") {
    return { success: false as const, error: "配信中のメールはRun作成できません" };
  }

  const segmentKeys = parseSegmentKeys(input.segmentKeys ?? campaign.segment_keys ?? []);
  if (campaign.campaign_type === "marketing" && segmentKeys.length === 0) {
    return { success: false as const, error: "配信セグメントを1つ以上選択してください" };
  }

  const includePreviouslySent = !!input.includePreviouslySent;
  const recipients = await resolveRecipientsBySegments(segmentKeys);

  let filtered = recipients;
  if (!includePreviouslySent) {
    const sentTargets = await listPreviouslySentTargets(campaignId);
    filtered = recipients.filter((recipient) => {
      if (recipient.userId && sentTargets.userIds.has(recipient.userId)) {
        return false;
      }
      return !sentTargets.emails.has(recipient.email.trim().toLowerCase());
    });
  }

  const now = new Date().toISOString();
  const adminDb = createAdminClient();

  const { data: runRow, error: runError } = await adminDb
    .from("marketing_campaign_runs")
    .insert({
      campaign_id: campaignId,
      status: "queued",
      segment_keys_snapshot: segmentKeys,
      include_previously_sent: includePreviouslySent,
      total_count: filtered.length,
      sent_count: 0,
      failed_count: 0,
      skipped_count: 0,
      queued_at: now,
      started_at: null,
      completed_at: null,
      created_by: admin.id,
      last_error: null,
    })
    .select("*")
    .single();

  if (runError || !runRow) {
    return { success: false as const, error: runError?.message ?? "Run作成に失敗しました" };
  }

  if (filtered.length > 0) {
    const { error: insertError } = await adminDb
      .from("marketing_campaign_run_recipients")
      .insert(
        filtered.map((recipient) => ({
          run_id: runRow.id,
          campaign_id: campaignId,
          user_id: recipient.userId,
          email: recipient.email,
          locale: recipient.locale,
          segment_key: recipient.segmentKey,
          status: "pending",
        }))
      );

    if (insertError) {
      await adminDb.from("marketing_campaign_runs").delete().eq("id", runRow.id);
      return { success: false as const, error: insertError.message };
    }
  }

  const { error: campaignUpdateError } = await adminDb
    .from("marketing_campaigns")
    .update({
      status: "queued",
      queued_at: now,
      started_at: null,
      completed_at: null,
      total_count: filtered.length,
      sent_count: 0,
      failed_count: 0,
      last_error: null,
    })
    .eq("id", campaignId);

  if (campaignUpdateError) {
    await adminDb.from("marketing_campaign_run_recipients").delete().eq("run_id", runRow.id);
    await adminDb.from("marketing_campaign_runs").delete().eq("id", runRow.id);
    return { success: false as const, error: campaignUpdateError.message };
  }

  revalidateCampaignPaths(campaignId);

  return {
    success: true as const,
    runId: runRow.id,
    totalCount: filtered.length,
    excludedCount: recipients.length - filtered.length,
    includePreviouslySent,
  };
}

export async function queueCampaign(campaignId: string) {
  const result = await createCampaignRun(campaignId, { includePreviouslySent: false });
  if (!result.success) return result;
  return {
    success: true as const,
    runId: result.runId,
    totalCount: result.totalCount,
    excludedCount: result.excludedCount,
  };
}

export async function deleteCampaign(campaignId: string) {
  await requireAdminForAction();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false as const, error: "メールが見つかりません" };
  }
  if (campaign.status === "sending") {
    return { success: false as const, error: "配信中のメールは削除できません" };
  }

  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from("marketing_campaigns")
    .delete()
    .eq("id", campaignId);
  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidateCampaignPaths(campaignId);

  return { success: true as const };
}

export async function duplicateCampaign(campaignId: string) {
  const admin = await requireAdminForAction();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false as const, error: "メールが見つかりません" };
  }
  if (campaign.campaign_type !== "marketing") {
    return { success: false as const, error: "マーケティングメールのみ複製できます" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const copiedTitle = `${campaign.title}（コピー ${today}）`;

  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaigns")
    .insert({
      title: copiedTitle,
      campaign_type: campaign.campaign_type,
      segment_keys: campaign.segment_keys,
      email_title_ja: campaign.email_title_ja,
      email_title_en: campaign.email_title_en,
      newsletter_label_ja: campaign.newsletter_label_ja,
      newsletter_label_en: campaign.newsletter_label_en,
      helper_text_ja: campaign.helper_text_ja,
      helper_text_en: campaign.helper_text_en,
      subject_ja: campaign.subject_ja,
      subject_en: campaign.subject_en,
      body_md_ja: campaign.body_md_ja,
      body_md_en: campaign.body_md_en,
      auto_send_enabled: false,
      status: "draft",
      created_by: admin.id,
      total_count: 0,
      sent_count: 0,
      failed_count: 0,
      queued_at: null,
      started_at: null,
      completed_at: null,
      last_error: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false as const, error: error?.message ?? "複製に失敗しました" };
  }

  revalidatePath("/admin/emails");
  return { success: true as const, campaignId: data.id };
}

export async function runCampaignRun(runId: string, batchSize = 20) {
  await requireAdminForAction();
  const run = await getCampaignRunById(runId);
  if (!run) {
    return { success: false as const, error: "Runが見つかりません" };
  }

  const campaign = await getCampaignById(run.campaign_id);
  if (!campaign) {
    return { success: false as const, error: "メールが見つかりません" };
  }
  if (campaign.campaign_type === "account_created") {
    return {
      success: false as const,
      error: "この種別のメールはキュー実行できません",
    };
  }

  const size = Math.max(1, Math.min(100, Math.floor(batchSize)));
  const adminDb = createAdminClient();

  const { data: recipients, error: recipientError } = await adminDb
    .from("marketing_campaign_run_recipients")
    .select("*")
    .eq("run_id", runId)
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(size);

  if (recipientError) {
    return { success: false as const, error: recipientError.message };
  }

  const pending = (recipients ?? []) as CampaignRunRecipientRecord[];
  if (pending.length === 0) {
    const counts = await refreshRunAggregate(runId);
    revalidateCampaignPaths(campaign.id);
    return {
      success: true as const,
      runId,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      remaining: counts.retryableCount,
    };
  }

  const now = new Date().toISOString();
  if (!run.started_at) {
    const { error: runUpdateError } = await adminDb
      .from("marketing_campaign_runs")
      .update({ status: "sending", started_at: now })
      .eq("id", runId);
    if (runUpdateError) {
      return { success: false as const, error: runUpdateError.message };
    }

    await adminDb
      .from("marketing_campaigns")
      .update({ status: "sending", started_at: now })
      .eq("id", campaign.id);
  } else {
    await adminDb
      .from("marketing_campaign_runs")
      .update({ status: "sending" })
      .eq("id", runId);

    await adminDb
      .from("marketing_campaigns")
      .update({ status: "sending" })
      .eq("id", campaign.id);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of pending) {
    const content = getLocalizedCampaignContent(campaign, recipient.locale);
    if (!content.subject.trim() || !content.bodyMarkdown.trim()) {
      await adminDb
        .from("marketing_campaign_run_recipients")
        .update({
          status: "failed",
          attempt_count: recipient.attempt_count + 1,
          last_error: "localized_content_missing",
        })
        .eq("id", recipient.id);
      failed += 1;
      continue;
    }

    if (!recipient.user_id) {
      await adminDb
        .from("marketing_campaign_run_recipients")
        .update({
          status: "failed",
          attempt_count: recipient.attempt_count + 1,
          last_error: "user_id_missing",
        })
        .eq("id", recipient.id);
      failed += 1;
      continue;
    }

    try {
      const preference = await ensurePreferenceForUser(recipient.user_id, recipient.locale);
      if (!preference.marketing_opt_in || !!preference.unsubscribed_at) {
        const { error: skipError } = await adminDb
          .from("marketing_campaign_run_recipients")
          .update({
            status: "skipped",
            attempt_count: recipient.attempt_count + 1,
            last_error: null,
          })
          .eq("id", recipient.id);
        if (skipError) throw skipError;
        skipped += 1;
        continue;
      }

      const unsubscribeUrl = `${baseUrl()}/api/emails/unsubscribe?token=${preference.unsubscribe_token}`;
      const { messageId } = await sendMarketingEmail({
        to: recipient.email,
        title: content.title,
        newsletterLabel: content.newsletterLabel,
        helperText: content.helperText,
        subject: content.subject,
        bodyMarkdown: content.bodyMarkdown,
        unsubscribeUrl,
        locale: recipient.locale,
      });

      const { error: updateError } = await adminDb
        .from("marketing_campaign_run_recipients")
        .update({
          status: "sent",
          attempt_count: recipient.attempt_count + 1,
          resend_message_id: messageId,
          last_error: null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", recipient.id);
      if (updateError) throw updateError;
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "send_failed";
      await adminDb
        .from("marketing_campaign_run_recipients")
        .update({
          status: "failed",
          attempt_count: recipient.attempt_count + 1,
          last_error: message,
        })
        .eq("id", recipient.id);
      failed += 1;
      await adminDb
        .from("marketing_campaign_runs")
        .update({ last_error: message })
        .eq("id", runId);
      await adminDb
        .from("marketing_campaigns")
        .update({ last_error: message })
        .eq("id", campaign.id);
    }
  }

  const counts = await refreshRunAggregate(runId);

  revalidateCampaignPaths(campaign.id);

  return {
    success: true as const,
    runId,
    processed: pending.length,
    sent,
    failed,
    skipped,
    remaining: counts.retryableCount,
  };
}

export async function runCampaignQueue(campaignId: string, batchSize = 20) {
  await requireAdminForAction();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false as const, error: "メールが見つかりません" };
  }
  if (campaign.campaign_type === "account_created") {
    return {
      success: false as const,
      error: "この種別のメールはキュー実行できません",
    };
  }

  const latestRun = await getLatestCampaignRunByCampaignId(campaignId);
  if (!latestRun) {
    return { success: false as const, error: "先にキュー作成を実行してください" };
  }

  return runCampaignRun(latestRun.id, batchSize);
}
