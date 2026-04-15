import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CampaignRecord,
  CampaignRunRecipientRecord,
  CampaignRunRecord,
  CampaignRecipientRecord,
  EmailPreferenceRecord,
} from "@/lib/marketing/types";

export async function listCampaigns(limit = 100): Promise<CampaignRecord[]> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CampaignRecord[];
}

export async function getCampaignById(id: string): Promise<CampaignRecord | null> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CampaignRecord | null;
}

export async function listCampaignRuns(
  campaignId: string,
  limit = 20
): Promise<CampaignRunRecord[]> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaign_runs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CampaignRunRecord[];
}

export async function getCampaignRunById(runId: string): Promise<CampaignRunRecord | null> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaign_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CampaignRunRecord | null;
}

export async function getLatestCampaignRunByCampaignId(
  campaignId: string
): Promise<CampaignRunRecord | null> {
  const runs = await listCampaignRuns(campaignId, 1);
  return runs[0] ?? null;
}

export async function getCampaignRunRecipients(
  runId: string,
  limit = 1000
): Promise<CampaignRunRecipientRecord[]> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaign_run_recipients")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CampaignRunRecipientRecord[];
}

export async function listLatestCampaignRunsByCampaignIds(
  campaignIds: string[]
): Promise<Record<string, CampaignRunRecord>> {
  if (campaignIds.length === 0) return {};
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaign_runs")
    .select("*")
    .in("campaign_id", campaignIds)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const latestMap: Record<string, CampaignRunRecord> = {};
  for (const row of (data ?? []) as CampaignRunRecord[]) {
    if (!latestMap[row.campaign_id]) {
      latestMap[row.campaign_id] = row;
    }
  }
  return latestMap;
}

export async function getCampaignRecipients(
  campaignId: string,
  limit = 500
): Promise<CampaignRecipientRecord[]> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_campaign_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CampaignRecipientRecord[];
}

export async function getPreferenceByUserId(
  userId: string
): Promise<EmailPreferenceRecord | null> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_email_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as EmailPreferenceRecord | null;
}

export async function getPreferenceByUnsubscribeToken(
  token: string
): Promise<EmailPreferenceRecord | null> {
  const adminDb = createAdminClient();
  const { data, error } = await adminDb
    .from("marketing_email_preferences")
    .select("*")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as EmailPreferenceRecord | null;
}

export async function getRecipientCounts(campaignId: string): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending: number;
}> {
  const adminDb = createAdminClient();
  const [totalRes, sentRes, failedRes, pendingRes] = await Promise.all([
    adminDb
      .from("marketing_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId),
    adminDb
      .from("marketing_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "sent"),
    adminDb
      .from("marketing_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "failed"),
    adminDb
      .from("marketing_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "pending"),
  ]);

  if (totalRes.error) throw totalRes.error;
  if (sentRes.error) throw sentRes.error;
  if (failedRes.error) throw failedRes.error;
  if (pendingRes.error) throw pendingRes.error;

  return {
    total: totalRes.count ?? 0,
    sent: sentRes.count ?? 0,
    failed: failedRes.count ?? 0,
    pending: pendingRes.count ?? 0,
  };
}
