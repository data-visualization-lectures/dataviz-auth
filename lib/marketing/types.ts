export const SEGMENT_KEYS = [
  "free_trialing",
  "free_trial_ended",
  "paid_individual",
  "paid_team",
  "free_academia",
] as const;

export type SegmentKey = (typeof SEGMENT_KEYS)[number];

export type CampaignStatus =
  | "draft"
  | "queued"
  | "sending"
  | "completed"
  | "failed";

export const CAMPAIGN_TYPES = [
  "account_created",
  "trial_expired_unconverted",
  "paid_canceled_nonrenewal",
  "marketing",
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export type RecipientStatus = "pending" | "sent" | "failed" | "skipped";

export type LocaleCode = "ja" | "en";

export type CampaignInput = {
  id?: string;
  title: string;
  emailTitleJa: string;
  emailTitleEn: string;
  autoSendEnabled: boolean;
  campaignType: CampaignType;
  segmentKeys: SegmentKey[];
  subjectJa: string;
  subjectEn: string;
  bodyMdJa: string;
  bodyMdEn: string;
  newsletterLabelJa: string;
  newsletterLabelEn: string;
  helperTextJa: string;
  helperTextEn: string;
};

export type CampaignRecord = {
  id: string;
  title: string;
  email_title_ja: string;
  email_title_en: string;
  auto_send_enabled: boolean;
  auto_send_enabled_at: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  segment_keys: SegmentKey[];
  subject_ja: string;
  subject_en: string;
  body_md_ja: string;
  body_md_en: string;
  newsletter_label_ja: string;
  newsletter_label_en: string;
  helper_text_ja: string;
  helper_text_en: string;
  created_by: string | null;
  test_sent_at: string | null;
  queued_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_count: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignRecipientRecord = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  email: string;
  locale: LocaleCode;
  segment_key: SegmentKey;
  status: RecipientStatus;
  attempt_count: number;
  resend_message_id: string | null;
  last_error: string | null;
  tracking_id: string;
  open_count: number;
  last_opened_at: string | null;
  click_count: number;
  last_clicked_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignRunStatus =
  | "draft"
  | "queued"
  | "sending"
  | "completed"
  | "failed";

export type CampaignRunRecord = {
  id: string;
  campaign_id: string;
  status: CampaignRunStatus;
  segment_keys_snapshot: SegmentKey[];
  include_previously_sent: boolean;
  total_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  queued_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignRunRecipientRecord = {
  id: string;
  run_id: string;
  campaign_id: string;
  user_id: string | null;
  email: string;
  locale: LocaleCode;
  segment_key: SegmentKey;
  status: RecipientStatus;
  attempt_count: number;
  resend_message_id: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateRunInput = {
  segmentKeys?: SegmentKey[];
  includePreviouslySent?: boolean;
};

export type EmailPreferenceRecord = {
  user_id: string;
  locale: LocaleCode;
  marketing_opt_in: boolean;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
  created_at: string;
  updated_at: string;
};

export type ResolvedRecipient = {
  userId: string;
  email: string;
  locale: LocaleCode;
  segmentKey: SegmentKey;
};

export type MarketingEventType =
  | "account_created"
  | "trial_expired_unconverted"
  | "paid_canceled_nonrenewal";

export type MarketingEventDeliveryStatus = "sent" | "failed" | "skipped";

export type MarketingEventDeliveryRecord = {
  id: string;
  event_type: MarketingEventType;
  event_key: string;
  user_id: string;
  campaign_id: string | null;
  email: string;
  locale: LocaleCode;
  status: MarketingEventDeliveryStatus;
  attempt_count: number;
  resend_message_id: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};
