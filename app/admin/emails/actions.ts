"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/marketing/admin-auth";
import { importHugoFromUrl, resolveUrlCard as resolveUrlCardInternal } from "@/lib/marketing/content-import";
import { getCampaignById, getRecipientCounts } from "@/lib/marketing/repository";
import { resolveRecipientsBySegments } from "@/lib/marketing/segments";
import { sendMarketingEmail } from "@/lib/marketing/send";
import { CAMPAIGN_TYPES, SEGMENT_KEYS } from "@/lib/marketing/types";
import type {
  CampaignInput,
  CampaignRecipientRecord,
  CampaignType,
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
  if (!input.title?.trim()) return "タイトルを入力してください";
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
  if (keys.length === 0) return "配信セグメントを1つ以上選択してください";
  return null;
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
    title: string;
  },
  locale: LocaleCode
) {
  if (locale === "en") {
    return {
      subject: campaign.subject_en,
      bodyMarkdown: campaign.body_md_en,
      newsletterLabel: campaign.newsletter_label_en,
      helperText: campaign.helper_text_en,
      title: campaign.title,
    };
  }
  return {
    subject: campaign.subject_ja,
    bodyMarkdown: campaign.body_md_ja,
    newsletterLabel: campaign.newsletter_label_ja,
    helperText: campaign.helper_text_ja,
    title: campaign.title,
  };
}

async function refreshCampaignAggregate(campaignId: string) {
  const adminDb = createAdminClient();
  const counts = await getRecipientCounts(campaignId);
  const {
    count: retryableCount,
    error: retryableError,
  } = await adminDb
    .from("marketing_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "failed"]);

  if (retryableError) throw retryableError;

  const status =
    (retryableCount ?? 0) === 0
      ? "completed"
      : counts.pending === 0
        ? "failed"
        : "sending";

  const { error } = await adminDb
    .from("marketing_campaigns")
    .update({
      total_count: counts.total,
      sent_count: counts.sent,
      failed_count: counts.failed,
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", campaignId);
  if (error) throw error;

  return {
    status,
    ...counts,
    retryableCount: retryableCount ?? 0,
  };
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

  const payload = {
    title: input.title.trim(),
    campaign_type: campaignType,
    segment_keys: segmentKeys,
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
      return { success: false as const, error: "キャンペーンが見つかりません" };
    }
    if (existing.status === "queued" || existing.status === "sending") {
      return { success: false as const, error: "配信中のキャンペーンは編集できません" };
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

    revalidatePath("/admin/emails");
    revalidatePath(`/admin/emails/${input.id}`);
    revalidatePath(`/admin/emails/${input.id}/edit`);
    revalidatePath(`/admin/emails/${input.id}/preview`);
    return { success: true as const, campaignId: input.id };
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
    return { success: false as const, error: "キャンペーンが見つかりません" };
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

    revalidatePath(`/admin/emails/${campaignId}`);
    revalidatePath(`/admin/emails/${campaignId}/test`);
    revalidatePath(`/admin/emails/${campaignId}/queue`);
    revalidatePath("/admin/emails");

    return { success: true as const, messageId };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "テスト送信に失敗しました",
    };
  }
}

export async function queueCampaign(campaignId: string) {
  await requireAdminForAction();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false as const, error: "キャンペーンが見つかりません" };
  }
  if (!campaign.test_sent_at) {
    return { success: false as const, error: "先にテスト送信を実行してください" };
  }
  if (campaign.status === "sending") {
    return { success: false as const, error: "配信中のキャンペーンはキュー作成できません" };
  }

  const recipients = await resolveRecipientsBySegments(campaign.segment_keys ?? []);
  const adminDb = createAdminClient();

  const { error: deleteError } = await adminDb
    .from("marketing_campaign_recipients")
    .delete()
    .eq("campaign_id", campaignId);
  if (deleteError) {
    return { success: false as const, error: deleteError.message };
  }

  if (recipients.length > 0) {
    const { error: insertError } = await adminDb
      .from("marketing_campaign_recipients")
      .insert(
        recipients.map((recipient) => ({
          campaign_id: campaignId,
          user_id: recipient.userId,
          email: recipient.email,
          locale: recipient.locale,
          segment_key: recipient.segmentKey,
          status: "pending",
        }))
      );
    if (insertError) {
      return { success: false as const, error: insertError.message };
    }
  }

  const now = new Date().toISOString();
  const { error: updateError } = await adminDb
    .from("marketing_campaigns")
    .update({
      status: "queued",
      queued_at: now,
      started_at: null,
      completed_at: null,
      total_count: recipients.length,
      sent_count: 0,
      failed_count: 0,
      last_error: null,
    })
    .eq("id", campaignId);
  if (updateError) {
    return { success: false as const, error: updateError.message };
  }

  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${campaignId}`);
  revalidatePath(`/admin/emails/${campaignId}/queue`);
  revalidatePath(`/admin/emails/${campaignId}/recipients`);
  return {
    success: true as const,
    totalCount: recipients.length,
  };
}

export async function deleteCampaign(campaignId: string) {
  await requireAdminForAction();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false as const, error: "キャンペーンが見つかりません" };
  }
  if (campaign.status === "sending") {
    return { success: false as const, error: "配信中のキャンペーンは削除できません" };
  }

  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from("marketing_campaigns")
    .delete()
    .eq("id", campaignId);
  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${campaignId}`);
  revalidatePath(`/admin/emails/${campaignId}/edit`);
  revalidatePath(`/admin/emails/${campaignId}/preview`);
  revalidatePath(`/admin/emails/${campaignId}/test`);
  revalidatePath(`/admin/emails/${campaignId}/queue`);
  revalidatePath(`/admin/emails/${campaignId}/recipients`);

  return { success: true as const };
}

export async function runCampaignQueue(campaignId: string, batchSize = 20) {
  await requireAdminForAction();
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false as const, error: "キャンペーンが見つかりません" };
  }
  if (campaign.status === "draft") {
    return { success: false as const, error: "先にキュー作成を実行してください" };
  }

  const size = Math.max(1, Math.min(100, Math.floor(batchSize)));
  const adminDb = createAdminClient();
  const { data: recipients, error: recipientError } = await adminDb
    .from("marketing_campaign_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(size);

  if (recipientError) {
    return { success: false as const, error: recipientError.message };
  }

  const pending = (recipients ?? []) as CampaignRecipientRecord[];
  if (pending.length === 0) {
    const counts = await refreshCampaignAggregate(campaignId);
    revalidatePath("/admin/emails");
    revalidatePath(`/admin/emails/${campaignId}`);
    revalidatePath(`/admin/emails/${campaignId}/queue`);
    revalidatePath(`/admin/emails/${campaignId}/recipients`);
    return {
      success: true as const,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      remaining: counts.retryableCount,
    };
  }

  if (!campaign.started_at) {
    await adminDb
      .from("marketing_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", campaignId);
  } else {
    await adminDb
      .from("marketing_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of pending) {
    const content = getLocalizedCampaignContent(campaign, recipient.locale);
    if (!content.subject.trim() || !content.bodyMarkdown.trim()) {
      const { error } = await adminDb
        .from("marketing_campaign_recipients")
        .update({
          status: "failed",
          attempt_count: recipient.attempt_count + 1,
          last_error: "localized_content_missing",
        })
        .eq("id", recipient.id);
      if (error) {
        failed += 1;
      } else {
        failed += 1;
      }
      continue;
    }

    if (!recipient.user_id) {
      const { error } = await adminDb
        .from("marketing_campaign_recipients")
        .update({
          status: "failed",
          attempt_count: recipient.attempt_count + 1,
          last_error: "user_id_missing",
        })
        .eq("id", recipient.id);
      if (error) {
        failed += 1;
      } else {
        failed += 1;
      }
      continue;
    }

    try {
      const preference = await ensurePreferenceForUser(recipient.user_id, recipient.locale);
      if (!preference.marketing_opt_in || !!preference.unsubscribed_at) {
        const { error: skipError } = await adminDb
          .from("marketing_campaign_recipients")
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
        .from("marketing_campaign_recipients")
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
        .from("marketing_campaign_recipients")
        .update({
          status: "failed",
          attempt_count: recipient.attempt_count + 1,
          last_error: message,
        })
        .eq("id", recipient.id);
      failed += 1;
      await adminDb
        .from("marketing_campaigns")
        .update({ last_error: message })
        .eq("id", campaignId);
    }
  }

  const counts = await refreshCampaignAggregate(campaignId);

  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${campaignId}`);
  revalidatePath(`/admin/emails/${campaignId}/queue`);
  revalidatePath(`/admin/emails/${campaignId}/recipients`);

  return {
    success: true as const,
    processed: pending.length,
    sent,
    failed,
    skipped,
    remaining: counts.retryableCount,
  };
}
