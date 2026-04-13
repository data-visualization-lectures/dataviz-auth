import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EmailPreferenceRecord,
  LocaleCode,
  ResolvedRecipient,
  SegmentKey,
} from "@/lib/marketing/types";

type AuthUser = {
  id: string;
  email: string;
  signupLocale: LocaleCode;
};

type SubscriptionRow = {
  user_id: string;
  plan_id: string | null;
  status: string | null;
};

const PAID_STATUSES = new Set(["active"]);

function chunk<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function listAllAuthUsers(): Promise<AuthUser[]> {
  const adminDb = createAdminClient();
  const users: AuthUser[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const {
      data: { users: pageUsers },
      error,
    } = await adminDb.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of pageUsers) {
      const email = user.email ?? "";
      if (!email) continue;
      const signupLocale = user.user_metadata?.signup_locale === "en" ? "en" : "ja";
      users.push({ id: user.id, email, signupLocale });
    }

    if (pageUsers.length < perPage) break;
    page += 1;
  }

  return users;
}

function hasPaidActiveSubscription(sub: SubscriptionRow | undefined): boolean {
  if (!sub) return false;
  const status = sub.status ?? "";
  if (!PAID_STATUSES.has(status)) return false;
  const plan = sub.plan_id ?? "";
  if (!plan) return false;
  if (plan === "trial" || plan === "admin" || plan === "academia") return false;
  return true;
}

function hasTeamPlan(sub: SubscriptionRow | undefined): boolean {
  if (!sub) return false;
  return (sub.plan_id ?? "").startsWith("team_") || sub.plan_id === "team_member";
}

function isAcademiaEmail(email: string, domains: string[]): boolean {
  return domains.some((domain) => email.endsWith(domain));
}

async function fetchPreferencesByUserIds(
  userIds: string[]
): Promise<Map<string, EmailPreferenceRecord>> {
  const adminDb = createAdminClient();
  const map = new Map<string, EmailPreferenceRecord>();
  for (const ids of chunk(userIds, 500)) {
    const { data, error } = await adminDb
      .from("marketing_email_preferences")
      .select("*")
      .in("user_id", ids);
    if (error) throw error;
    for (const row of (data ?? []) as EmailPreferenceRecord[]) {
      map.set(row.user_id, row);
    }
  }
  return map;
}

export async function resolveRecipientsBySegments(
  segmentKeys: SegmentKey[]
): Promise<ResolvedRecipient[]> {
  const adminDb = createAdminClient();
  const [users, subscriptionsRes, groupMembersRes, domainsRes] = await Promise.all([
    listAllAuthUsers(),
    adminDb
      .from("subscriptions")
      .select("user_id, plan_id, status"),
    adminDb.from("group_members").select("user_id"),
    adminDb.from("academia_domains").select("domain").eq("is_active", true),
  ]);

  if (subscriptionsRes.error) throw subscriptionsRes.error;
  if (groupMembersRes.error) throw groupMembersRes.error;
  if (domainsRes.error) throw domainsRes.error;

  const subscriptions = (subscriptionsRes.data ?? []) as SubscriptionRow[];
  const subMap = new Map<string, SubscriptionRow>();
  for (const sub of subscriptions) {
    if (!sub.user_id) continue;
    subMap.set(sub.user_id, sub);
  }

  const memberSet = new Set((groupMembersRes.data ?? []).map((row) => row.user_id));
  const activeDomains = (domainsRes.data ?? []).map((row) => row.domain);

  const userIds = users.map((u) => u.id);
  const prefMap = await fetchPreferencesByUserIds(userIds);

  const missingDefaults = users
    .filter((u) => !prefMap.has(u.id))
    .map((u) => ({
      user_id: u.id,
      locale: u.signupLocale,
      marketing_opt_in: true,
    }));

  if (missingDefaults.length > 0) {
    const { error } = await adminDb
      .from("marketing_email_preferences")
      .upsert(missingDefaults, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) throw error;

    const refetchedMap = await fetchPreferencesByUserIds(userIds);
    for (const [key, value] of refetchedMap.entries()) {
      prefMap.set(key, value);
    }
  }

  const selected = new Map<string, ResolvedRecipient>();

  for (const segmentKey of segmentKeys) {
    for (const user of users) {
      const pref = prefMap.get(user.id);
      if (pref && (!pref.marketing_opt_in || !!pref.unsubscribed_at)) {
        continue;
      }
      const sub = subMap.get(user.id);

      const match = (() => {
        if (segmentKey === "free_trialing") {
          return sub?.plan_id === "trial" && sub?.status === "trialing";
        }
        if (segmentKey === "free_trial_ended") {
          return sub?.plan_id === "trial" && sub?.status === "canceled";
        }
        if (segmentKey === "paid_team") {
          return (
            (hasPaidActiveSubscription(sub) && hasTeamPlan(sub)) ||
            memberSet.has(user.id)
          );
        }
        if (segmentKey === "paid_individual") {
          return (
            hasPaidActiveSubscription(sub) &&
            !hasTeamPlan(sub) &&
            !memberSet.has(user.id)
          );
        }
        if (segmentKey === "free_academia") {
          return (
            isAcademiaEmail(user.email, activeDomains) &&
            !hasPaidActiveSubscription(sub)
          );
        }
        return false;
      })();

      if (!match) continue;
      if (selected.has(user.id)) continue;

      const locale = pref?.locale ?? user.signupLocale ?? "ja";
      selected.set(user.id, {
        userId: user.id,
        email: user.email,
        locale,
        segmentKey,
      });
    }
  }

  return Array.from(selected.values());
}
