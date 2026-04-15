import { createAdminClient } from "@/lib/supabase/admin";
import { sendMarketingEmail } from "@/lib/marketing/send";
import type {
  CampaignRecord,
  EmailPreferenceRecord,
  LocaleCode,
  MarketingEventDeliveryRecord,
  MarketingEventType,
} from "@/lib/marketing/types";

export const AUTOMATION_MAX_RETRY = 3;
export const ACCOUNT_CREATED_MAX_RETRY = AUTOMATION_MAX_RETRY;

type AutomationEventType = MarketingEventType;

type SubscriptionCandidate = {
  user_id: string;
  plan_id: string | null;
  status: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  updated_at: string | null;
};

type AuthUserInfo = {
  email: string;
  signupLocale: LocaleCode;
};

type AutomationSendReason =
  | "user_or_email_missing"
  | "event_key_missing"
  | "active_campaign_not_found"
  | "campaign_not_tested"
  | "already_sent"
  | "already_skipped"
  | "retry_limit_reached"
  | "opted_out"
  | "retry_opted_out"
  | "localized_content_missing"
  | "send_failed";

type AutomationSendResult =
  | {
      sent: true;
      locale: LocaleCode;
      campaignId: string;
    }
  | {
      sent: false;
      reason: AutomationSendReason;
    };

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://app.dataviz.jp";
}

function getLocalizedCampaignContent(campaign: CampaignRecord, locale: LocaleCode) {
  if (locale === "en") {
    return {
      subject: campaign.subject_en,
      bodyMarkdown: campaign.body_md_en,
      newsletterLabel: campaign.newsletter_label_en,
      helperText: campaign.helper_text_en,
      title: campaign.email_title_en?.trim() || campaign.email_title_ja?.trim() || campaign.title,
    };
  }

  return {
    subject: campaign.subject_ja,
    bodyMarkdown: campaign.body_md_ja,
    newsletterLabel: campaign.newsletter_label_ja,
    helperText: campaign.helper_text_ja,
    title: campaign.email_title_ja?.trim() || campaign.email_title_en?.trim() || campaign.title,
  };
}

async function findActiveAutomationCampaign(
  eventType: AutomationEventType
): Promise<CampaignRecord | null> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaigns")
    .select("*")
    .eq("campaign_type", eventType)
    .eq("auto_send_enabled", true)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as CampaignRecord | null;
}

async function ensurePreferenceForUser(
  userId: string,
  fallbackLocale: LocaleCode
): Promise<EmailPreferenceRecord> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_email_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as EmailPreferenceRecord;

  const { error: upsertError } = await adminDb
    .from("marketing_email_preferences")
    .upsert(
      {
        user_id: userId,
        locale: fallbackLocale,
        marketing_opt_in: true,
      },
      { onConflict: "user_id" }
    );
  if (upsertError) throw upsertError;

  const { data: created, error: createdError } = await adminDb
    .from("marketing_email_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (createdError) throw createdError;

  return created as EmailPreferenceRecord;
}

async function findDeliveryByEventKey(
  eventType: AutomationEventType,
  eventKey: string
): Promise<MarketingEventDeliveryRecord | null> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_event_deliveries")
    .select("*")
    .eq("event_type", eventType)
    .eq("event_key", eventKey)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as MarketingEventDeliveryRecord | null;
}

async function upsertDelivery(row: {
  eventType: AutomationEventType;
  eventKey: string;
  userId: string;
  campaignId: string | null;
  email: string;
  locale: LocaleCode;
  status: "sent" | "failed" | "skipped";
  attemptCount: number;
  resendMessageId?: string | null;
  lastError?: string | null;
  sentAt?: string | null;
}) {
  const adminDb = createAdminClient();
  const { error } = await adminDb
    .from("marketing_event_deliveries")
    .upsert(
      {
        event_type: row.eventType,
        event_key: row.eventKey,
        user_id: row.userId,
        campaign_id: row.campaignId,
        email: row.email,
        locale: row.locale,
        status: row.status,
        attempt_count: row.attemptCount,
        resend_message_id: row.resendMessageId ?? null,
        last_error: row.lastError ?? null,
        sent_at: row.sentAt ?? null,
      },
      { onConflict: "event_type,event_key" }
    );
  if (error) throw error;
}

function shouldRespectOptOut(eventType: AutomationEventType, isRetry: boolean): boolean {
  if (eventType === "account_created") {
    return isRetry;
  }
  return true;
}

function isFailureReason(reason: AutomationSendReason): boolean {
  return reason === "localized_content_missing" || reason === "send_failed";
}

export async function sendAutomationEmailIfNeeded(params: {
  eventType: AutomationEventType;
  eventKey: string;
  userId: string;
  email: string | null | undefined;
  localeHint?: LocaleCode;
}): Promise<AutomationSendResult> {
  const email = (params.email ?? "").trim();
  if (!params.userId || !email || !email.includes("@")) {
    return { sent: false, reason: "user_or_email_missing" };
  }
  if (!params.eventKey?.trim()) {
    return { sent: false, reason: "event_key_missing" };
  }

  const campaign = await findActiveAutomationCampaign(params.eventType);
  if (!campaign) {
    return { sent: false, reason: "active_campaign_not_found" };
  }
  if (!campaign.test_sent_at) {
    return { sent: false, reason: "campaign_not_tested" };
  }

  const fallbackLocale: LocaleCode = params.localeHint === "en" ? "en" : "ja";
  const preference = await ensurePreferenceForUser(params.userId, fallbackLocale);
  const locale: LocaleCode = preference.locale === "en" ? "en" : "ja";
  const existing = await findDeliveryByEventKey(params.eventType, params.eventKey);

  if (existing?.status === "sent") {
    return { sent: false, reason: "already_sent" };
  }
  if (existing?.status === "skipped") {
    return { sent: false, reason: "already_skipped" };
  }
  if (existing?.status === "failed" && existing.attempt_count >= AUTOMATION_MAX_RETRY) {
    return { sent: false, reason: "retry_limit_reached" };
  }

  const attemptBase = existing?.attempt_count ?? 0;
  const isRetry = attemptBase > 0;
  const optedOut = !preference.marketing_opt_in || !!preference.unsubscribed_at;
  if (shouldRespectOptOut(params.eventType, isRetry) && optedOut) {
    await upsertDelivery({
      eventType: params.eventType,
      eventKey: params.eventKey,
      userId: params.userId,
      campaignId: campaign.id,
      email,
      locale,
      status: "skipped",
      attemptCount: attemptBase + 1,
      lastError: isRetry ? "opted_out_on_retry" : "opted_out",
    });
    return {
      sent: false,
      reason: isRetry ? "retry_opted_out" : "opted_out",
    };
  }

  const content = getLocalizedCampaignContent(campaign, locale);
  if (!content.subject.trim() || !content.bodyMarkdown.trim()) {
    await upsertDelivery({
      eventType: params.eventType,
      eventKey: params.eventKey,
      userId: params.userId,
      campaignId: campaign.id,
      email,
      locale,
      status: "failed",
      attemptCount: attemptBase + 1,
      lastError: "localized_content_missing",
    });
    return { sent: false, reason: "localized_content_missing" };
  }

  try {
    const unsubscribeUrl = `${baseUrl()}/api/emails/unsubscribe?token=${preference.unsubscribe_token}`;
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

    await upsertDelivery({
      eventType: params.eventType,
      eventKey: params.eventKey,
      userId: params.userId,
      campaignId: campaign.id,
      email,
      locale,
      status: "sent",
      attemptCount: attemptBase + 1,
      resendMessageId: messageId,
      lastError: null,
      sentAt: new Date().toISOString(),
    });

    return { sent: true, locale, campaignId: campaign.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "send_failed";
    await upsertDelivery({
      eventType: params.eventType,
      eventKey: params.eventKey,
      userId: params.userId,
      campaignId: campaign.id,
      email,
      locale,
      status: "failed",
      attemptCount: attemptBase + 1,
      lastError: message,
    });
    return { sent: false, reason: "send_failed" };
  }
}

export async function sendAccountCreatedEmailIfNeeded(params: {
  userId: string;
  email: string | null | undefined;
  signupLocale?: LocaleCode;
}): Promise<AutomationSendResult> {
  return sendAutomationEmailIfNeeded({
    eventType: "account_created",
    eventKey: params.userId,
    userId: params.userId,
    email: params.email,
    localeHint: params.signupLocale,
  });
}

async function listAuthUsersMap(): Promise<Map<string, AuthUserInfo>> {
  const adminDb = createAdminClient();
  const map = new Map<string, AuthUserInfo>();
  const perPage = 1000;
  let page = 1;

  while (true) {
    const {
      data: { users: pageUsers },
      error,
    } = await adminDb.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of pageUsers) {
      const email = user.email?.trim();
      if (!email) continue;
      map.set(user.id, {
        email,
        signupLocale: user.user_metadata?.signup_locale === "en" ? "en" : "ja",
      });
    }

    if (pageUsers.length < perPage) break;
    page += 1;
  }

  return map;
}

function buildTrialExpiredEventKey(row: SubscriptionCandidate): string {
  const periodEnd = row.current_period_end ?? "none";
  return `trial_expired_unconverted:${row.user_id}:${periodEnd}`;
}

function buildPaidCanceledEventKey(row: SubscriptionCandidate): string {
  const periodEnd = row.current_period_end ?? "none";
  const stripeSubscriptionId = row.stripe_subscription_id ?? "none";
  const planId = row.plan_id ?? "none";
  return `paid_canceled_nonrenewal:${row.user_id}:${stripeSubscriptionId}:${planId}:${periodEnd}`;
}

function getCandidateStartAt(campaign: CampaignRecord): string {
  return campaign.auto_send_enabled_at ?? new Date().toISOString();
}

async function listTrialExpiredCandidates(startAt: string): Promise<SubscriptionCandidate[]> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("subscriptions")
    .select("user_id, plan_id, status, current_period_end, stripe_subscription_id, updated_at")
    .eq("plan_id", "trial")
    .eq("status", "canceled")
    .gte("updated_at", startAt)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SubscriptionCandidate[];
}

async function listPaidCanceledCandidates(startAt: string): Promise<SubscriptionCandidate[]> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("subscriptions")
    .select("user_id, plan_id, status, current_period_end, stripe_subscription_id, updated_at")
    .eq("status", "canceled")
    .not("plan_id", "is", null)
    .not("plan_id", "in", "(trial,admin,academia,team_member)")
    .gte("updated_at", startAt)
    .order("updated_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SubscriptionCandidate[];
}

export async function dispatchChurnAutomationEmails() {
  const [trialCampaign, paidCampaign] = await Promise.all([
    findActiveAutomationCampaign("trial_expired_unconverted"),
    findActiveAutomationCampaign("paid_canceled_nonrenewal"),
  ]);

  if (!trialCampaign && !paidCampaign) {
    return {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      trialCandidates: 0,
      paidCandidates: 0,
    };
  }

  const usersMap = await listAuthUsersMap();

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let trialCandidates = 0;
  let paidCandidates = 0;

  if (trialCampaign?.test_sent_at) {
    const candidates = await listTrialExpiredCandidates(getCandidateStartAt(trialCampaign));
    trialCandidates = candidates.length;
    for (const candidate of candidates) {
      const user = usersMap.get(candidate.user_id);
      if (!user?.email) {
        skipped += 1;
        processed += 1;
        continue;
      }
      const result = await sendAutomationEmailIfNeeded({
        eventType: "trial_expired_unconverted",
        eventKey: buildTrialExpiredEventKey(candidate),
        userId: candidate.user_id,
        email: user.email,
        localeHint: user.signupLocale,
      });
      processed += 1;
      if (result.sent) {
        sent += 1;
      } else if (isFailureReason(result.reason)) {
        failed += 1;
      } else {
        skipped += 1;
      }
    }
  }

  if (paidCampaign?.test_sent_at) {
    const candidates = await listPaidCanceledCandidates(getCandidateStartAt(paidCampaign));
    paidCandidates = candidates.length;
    for (const candidate of candidates) {
      const user = usersMap.get(candidate.user_id);
      if (!user?.email) {
        skipped += 1;
        processed += 1;
        continue;
      }
      const result = await sendAutomationEmailIfNeeded({
        eventType: "paid_canceled_nonrenewal",
        eventKey: buildPaidCanceledEventKey(candidate),
        userId: candidate.user_id,
        email: user.email,
        localeHint: user.signupLocale,
      });
      processed += 1;
      if (result.sent) {
        sent += 1;
      } else if (isFailureReason(result.reason)) {
        failed += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return {
    processed,
    sent,
    skipped,
    failed,
    trialCandidates,
    paidCandidates,
  };
}
