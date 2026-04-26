const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dataviz.jp";

type QueryResult<T> = PromiseLike<{ data: T | null }>;

type SupabaseLikeClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => QueryResult<Record<string, unknown>>;
      };
    };
  };
};

export type ApiMeResponse = {
  profile?: {
    is_admin?: boolean | null;
  } | null;
  subscription?: {
    status?: string | null;
    plan_id?: string | null;
    current_period_end?: string | null;
  } | null;
};

export type ToolAccessState = {
  canUseTool: boolean;
  isAdmin: boolean;
  isSubscribed: boolean;
  status: string | null;
  planId: string | null;
  source: "api-me" | "fallback";
};

function isLegacySubscribed(subscription: Record<string, unknown> | null): boolean {
  if (!subscription) return false;

  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end;
  const isActiveOrTrialing = status === "active" || status === "trialing";
  if (!isActiveOrTrialing) return false;

  if (!currentPeriodEnd) return true;
  const periodEnd = new Date(String(currentPeriodEnd));
  return periodEnd > new Date();
}

export function resolveToolAccessFromApiMe(me: ApiMeResponse | null): ToolAccessState | null {
  if (!me) return null;

  const status = me.subscription?.status ?? null;
  const planId = me.subscription?.plan_id ?? null;
  const isAdmin = !!me.profile?.is_admin;
  const isSubscribed = status === "active" || status === "trialing";

  return {
    canUseTool: isAdmin || isSubscribed,
    isAdmin,
    isSubscribed,
    status,
    planId,
    source: "api-me",
  };
}

export async function fetchApiMeWithToken(
  accessToken: string,
): Promise<ApiMeResponse | null> {
  const res = await fetch(`${API_BASE}/api/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as ApiMeResponse;
}

async function getFallbackToolAccess(
  supabase: SupabaseLikeClient,
  userId: string,
): Promise<ToolAccessState> {
  const [{ data: subscription }, { data: profile }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const status =
    typeof subscription?.status === "string" ? subscription.status : null;
  const isSubscribed = isLegacySubscribed(subscription);
  const isAdmin = !!profile?.is_admin;

  return {
    canUseTool: isSubscribed || isAdmin,
    isAdmin,
    isSubscribed,
    status,
    planId: null,
    source: "fallback",
  };
}

export async function getToolAccessForUser(params: {
  supabase: unknown;
  userId: string;
  accessToken?: string | null;
}): Promise<ToolAccessState> {
  const { supabase, userId, accessToken } = params;

  if (accessToken) {
    try {
      const me = await fetchApiMeWithToken(accessToken);
      const access = resolveToolAccessFromApiMe(me);
      if (access) {
        return access;
      }
    } catch (error) {
      console.error("Failed to fetch /api/me for tool access", error);
    }
  }

  return getFallbackToolAccess(supabase as SupabaseLikeClient, userId);
}
