import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserGrowthChart,
  SubscriptionGrowthChart,
  PlanDistributionChart,
  TrialBreakdownChart,
} from "@/components/admin-charts";
import { AdminUserList } from "@/components/admin-user-list";
import type { AdminUserRow } from "@/types/user";

export const dynamic = "force-dynamic";

// MRR月額換算テーブル
const MRR_MONTHLY_AMOUNTS: Record<string, number> = {
  pro_monthly: 2480,
  pro_yearly: Math.round(24800 / 12),
  coaching_monthly: 6980,
  coaching_yearly: Math.round(69800 / 12),
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // 管理者チェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return redirect("/account");
  }

  // Service Role クライアント（RLSバイパス：統計クエリ + auth.users 取得用）
  const adminDb = createAdminClient();

  // 管理者ユーザーIDを取得（統計から除外用）
  const { data: adminProfiles } = await adminDb
    .from("profiles")
    .select("id")
    .eq("is_admin", true);
  const adminIds = (adminProfiles ?? []).map((p) => p.id);
  const adminFilter = `(${adminIds.join(",")})`;
  const allAuthUsers: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data: { users } } = await adminDb.auth.admin.listUsers({ page, perPage });
    allAuthUsers.push(...users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    })));
    if (users.length < perPage) break;
    page++;
  }

  // auth.users ベースの統計（管理者除外）
  const nonAdminUsers = allAuthUsers.filter((u) => !adminIds.includes(u.id));
  const totalUsers = nonAdminUsers.length;
  const profileRows = nonAdminUsers.map((u) => ({ created_at: u.created_at }));

  // 今月の初日
  const now = new Date();
  const nowIso = now.toISOString();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`;

  // 統計データ取得
  const [
    { count: paidSubscriptions },
    { data: activeSubsWithPlan },
    { data: subscriptionRows },
    { data: trialSubs },
    { count: paidActiveCount },
    { count: canceledThisMonth },
    { count: refundedCount },
    { count: projectCount },
    { count: openrefineProjectCount },
    { data: planDistributionRows },
    { data: allPlans },
  ] = await Promise.all([
    // 有料サブスク数（active のみ、管理者・期限切れ除外）
    adminDb
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .not("user_id", "in", adminFilter)
      .neq("plan_id", "admin")
      .gte("current_period_end", nowIso),
    // MRR用: activeな有料サブスクとプランID（期限切れ除外）
    adminDb
      .from("subscriptions")
      .select("plan_id")
      .eq("status", "active")
      .in("plan_id", ["pro_monthly", "pro_yearly", "coaching_monthly", "coaching_yearly"])
      .not("user_id", "in", adminFilter)
      .gte("current_period_end", nowIso),
    // 月別サブスク推移用
    adminDb
      .from("subscriptions")
      .select("created_at")
      .not("user_id", "in", adminFilter),
    // トライアル関連（状態内訳用）
    adminDb
      .from("subscriptions")
      .select("status, plan_id, current_period_end")
      .eq("plan_id", "trial")
      .not("user_id", "in", adminFilter),
    // 有料プランactive数（転換率の分子、期限切れ除外）
    adminDb
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .in("plan_id", ["pro_monthly", "pro_yearly", "coaching_monthly", "coaching_yearly"])
      .eq("status", "active")
      .not("user_id", "in", adminFilter)
      .gte("current_period_end", nowIso),
    // 今月の解約数
    adminDb
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "canceled")
      .gte("updated_at", firstDayOfMonth)
      .not("user_id", "in", adminFilter),
    // 返金件数
    adminDb
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .not("refunded_at", "is", null)
      .not("user_id", "in", adminFilter),
    // プロジェクト総数
    adminDb
      .from("projects")
      .select("*", { count: "exact", head: true })
      .not("user_id", "in", adminFilter),
    // OpenRefineプロジェクト総数
    adminDb
      .from("openrefine_projects")
      .select("*", { count: "exact", head: true })
      .not("user_id", "in", adminFilter),
    // プラン別内訳（active + trialing、期限切れ除外）
    adminDb
      .from("subscriptions")
      .select("plan_id")
      .in("status", ["active", "trialing"])
      .not("user_id", "in", adminFilter)
      .gte("current_period_end", nowIso),
    // プラン名マスタ
    adminDb
      .from("plans")
      .select("id, name"),
  ]);

  const planMap = new Map((allPlans ?? []).map((p) => [p.id, p]));

  // ユーザー一覧用データ取得
  const [
    { data: allProfiles },
    { data: allSubscriptions },
    { data: academiaDomains },
  ] = await Promise.all([
    adminDb
      .from("profiles")
      .select("id, display_name")
      .not("id", "in", adminFilter),
    adminDb
      .from("subscriptions")
      .select("user_id, status, plan_id, current_period_end, cancel_at_period_end, created_at")
      .not("user_id", "in", adminFilter),
    adminDb
      .from("academia_domains")
      .select("domain")
      .eq("is_active", true),
  ]);

  const profileMap = new Map((allProfiles ?? []).map((p) => [p.id, p]));
  const subMap = new Map((allSubscriptions ?? []).map((s) => [s.user_id, s]));
  const activeDomains = (academiaDomains ?? []).map((d) => d.domain);

  const userList: AdminUserRow[] = nonAdminUsers.map((u) => {
    const prof = profileMap.get(u.id);
    const sub = subMap.get(u.id);
    const planName = sub?.plan_id ? (planMap.get(sub.plan_id)?.name ?? sub.plan_id) : null;

    const isAcademia =
      (!sub || (sub.status !== "active" && sub.status !== "trialing")) &&
      activeDomains.some((domain) => u.email.endsWith(domain));

    return {
      id: u.id,
      email: u.email,
      displayName: prof?.display_name ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
      subscriptionStatus: isAcademia ? "active" : (sub?.status ?? null),
      planName: isAcademia ? "アカデミア" : planName,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      currentPeriodEnd: isAcademia ? null : (sub?.current_period_end ?? null),
      subscriptionCreatedAt: sub?.created_at ?? null,
    };
  });

  // MRR計算
  const mrr = (activeSubsWithPlan ?? []).reduce((sum, sub) => {
    return sum + (MRR_MONTHLY_AMOUNTS[sub.plan_id] ?? 0);
  }, 0);

  // トライアル→有料転換率
  const totalTrialEver = (trialSubs ?? []).length + (paidActiveCount ?? 0);
  const conversionRate = totalTrialEver > 0
    ? Math.round(((paidActiveCount ?? 0) / totalTrialEver) * 1000) / 10
    : 0;

  // トライアル状態内訳
  const trialBreakdown = (() => {
    const subs = trialSubs ?? [];
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    for (const sub of subs) {
      if (sub.status === "trialing") {
        const end = new Date(sub.current_period_end).getTime();
        if (end < now) {
          expired++;
        } else if (end - now < sevenDaysMs) {
          expiringSoon++;
        } else {
          active++;
        }
      } else if (sub.status === "canceled") {
        expired++;
      }
    }
    return [
      { label: "トライアル中", value: active },
      { label: "7日以内に期限切れ", value: expiringSoon },
      { label: "期限切れ", value: expired },
      { label: "有料転換済", value: paidActiveCount ?? 0 },
    ];
  })();

  // プラン別内訳集計
  const planDistribution = (() => {
    const counts: Record<string, { name: string; count: number }> = {};
    for (const row of planDistributionRows ?? []) {
      const name = planMap.get(row.plan_id)?.name ?? row.plan_id;
      if (!counts[row.plan_id]) {
        counts[row.plan_id] = { name, count: 0 };
      }
      counts[row.plan_id].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count);
  })();

  // プロジェクト合計
  const totalProjects = (projectCount ?? 0) + (openrefineProjectCount ?? 0);

  // 月別集計ヘルパー
  function aggregateByMonth(rows: { created_at: string }[] | null) {
    const counts: Record<string, number> = {};
    for (const row of rows ?? []) {
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }

  const userGrowth = aggregateByMonth(profileRows);
  const subscriptionGrowth = aggregateByMonth(subscriptionRows);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-0 max-w-5xl mx-auto w-full">

        <div className="flex flex-col gap-2 mb-4">
          <h2 className="text-3xl font-bold tracking-tight">管理者ダッシュボード</h2>
          <p className="text-muted-foreground">
            ユーザー数・サブスクリプション・売上の概要
          </p>
        </div>

        {/* 主要指標カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                総ユーザー数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                有料サブスクリプション数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{paidSubscriptions ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                MRR（月間定期収益）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {mrr.toLocaleString()}円
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 補助指標カード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                トライアル→有料転換率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                解約数（今月）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{canceledThisMonth ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                返金件数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{refundedCount ?? 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                プロジェクト総数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                トライアル中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trialBreakdown[0].value + trialBreakdown[1].value}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 推移グラフ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ユーザー登録推移（月別）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UserGrowthChart data={userGrowth} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                サブスクリプション推移（月別）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SubscriptionGrowthChart data={subscriptionGrowth} />
            </CardContent>
          </Card>
        </div>

        {/* 内訳チャート */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                プラン別内訳
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PlanDistributionChart data={planDistribution} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                トライアル状態内訳
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrialBreakdownChart data={trialBreakdown} />
            </CardContent>
          </Card>
        </div>

        {/* ユーザー一覧 */}
        <AdminUserList data={userList} />

      </main>
    </div>
  );
}
