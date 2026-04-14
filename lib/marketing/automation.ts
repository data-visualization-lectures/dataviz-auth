import { createAdminClient } from "@/lib/supabase/admin";
import { sendMarketingEmail } from "@/lib/marketing/send";
import type {
  CampaignRecord,
  EmailPreferenceRecord,
  LocaleCode,
  MarketingEventDeliveryRecord,
} from "@/lib/marketing/types";

export const ACCOUNT_CREATED_MAX_RETRY = 3;
const EVENT_TYPE = "account_created" as const;

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

async function findActiveAccountCreatedCampaign(): Promise<CampaignRecord | null> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaigns")
    .select("*")
    .eq("campaign_type", "account_created")
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

async function findDeliveryByUserId(
  userId: string
): Promise<MarketingEventDeliveryRecord | null> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_event_deliveries")
    .select("*")
    .eq("event_type", EVENT_TYPE)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as MarketingEventDeliveryRecord | null;
}

async function upsertDelivery(row: {
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
        event_type: EVENT_TYPE,
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
      { onConflict: "event_type,user_id" }
    );
  if (error) throw error;
}

export async function sendAccountCreatedEmailIfNeeded(params: {
  userId: string;
  email: string | null | undefined;
  signupLocale?: LocaleCode;
}) {
  const email = (params.email ?? "").trim();
  if (!params.userId || !email || !email.includes("@")) {
    return { skipped: true as const, reason: "user_or_email_missing" as const };
  }

  const campaign = await findActiveAccountCreatedCampaign();
  if (!campaign) {
    return { skipped: true as const, reason: "active_campaign_not_found" as const };
  }
  if (!campaign.test_sent_at) {
    return { skipped: true as const, reason: "campaign_not_tested" as const };
  }

  const fallbackLocale: LocaleCode = params.signupLocale === "en" ? "en" : "ja";
  const preference = await ensurePreferenceForUser(params.userId, fallbackLocale);
  const locale: LocaleCode = preference.locale === "en" ? "en" : "ja";
  const existing = await findDeliveryByUserId(params.userId);

  if (existing?.status === "sent") {
    return { skipped: true as const, reason: "already_sent" as const };
  }
  if (existing?.status === "skipped") {
    return { skipped: true as const, reason: "already_skipped" as const };
  }
  if (existing?.status === "failed" && existing.attempt_count >= ACCOUNT_CREATED_MAX_RETRY) {
    return { skipped: true as const, reason: "retry_limit_reached" as const };
  }

  const attemptBase = existing?.attempt_count ?? 0;
  const isRetry = attemptBase > 0;
  if (isRetry && (!preference.marketing_opt_in || !!preference.unsubscribed_at)) {
    await upsertDelivery({
      userId: params.userId,
      campaignId: campaign.id,
      email,
      locale,
      status: "skipped",
      attemptCount: attemptBase + 1,
      lastError: "opted_out_on_retry",
    });
    return { skipped: true as const, reason: "retry_opted_out" as const };
  }

  const content = getLocalizedCampaignContent(campaign, locale);
  if (!content.subject.trim() || !content.bodyMarkdown.trim()) {
    await upsertDelivery({
      userId: params.userId,
      campaignId: campaign.id,
      email,
      locale,
      status: "failed",
      attemptCount: attemptBase + 1,
      lastError: "localized_content_missing",
    });
    return { skipped: true as const, reason: "localized_content_missing" as const };
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

    return { sent: true as const, locale, campaignId: campaign.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "send_failed";
    await upsertDelivery({
      userId: params.userId,
      campaignId: campaign.id,
      email,
      locale,
      status: "failed",
      attemptCount: attemptBase + 1,
      lastError: message,
    });
    return { skipped: true as const, reason: "send_failed" as const };
  }
}
