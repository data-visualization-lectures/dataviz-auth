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

  // 管理者ユーザーIDを取得（統計から除外用）
  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_admin", true);
  const adminIds = (adminProfiles ?? []).map((p) => p.id);
  const adminFilter = `(${adminIds.join(",")})`;

  // auth.users から全ユーザー取得（ページネーション対応）
  const adminClient = createAdminClient();
  const allAuthUsers: { id: string; created_at: string }[] = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data: { users } } = await adminClient.auth.admin.listUsers({ page, perPage });
    allAuthUsers.push(...users.map((u) => ({ id: u.id, created_at: u.created_at })));
    if (users.length < perPage) break;
    page++;
  }

  // auth.users ベースの統計（管理者除外）
  const nonAdminUsers = allAuthUsers.filter((u) => !adminIds.includes(u.id));
  const totalUsers = nonAdminUsers.length;
  const profileRows = nonAdminUsers.map((u) => ({ created_at: u.created_at }));

  // 今月の初日
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`;

  // 統計データ取得
  const [
    { count: activeSubscriptions },
    { data: activeSubsWithPlan },
    { data: subscriptionRows },
    { data: trialSubs },
    { count: paidActiveCount },
    { count: canceledThisMonth },
    { count: refundedCount },
    { count: projectCount },
    { count: openrefineProjectCount },
    { data: planDistributionRows },
  ] = await Promise.all([
    // 有効サブスク数
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "trialing"])
      .not("user_id", "in", adminFilter),
    // MRR用: activeな有料サブスクとプランID
    supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("status", "active")
      .in("plan_id", ["pro_monthly", "pro_yearly", "coaching_monthly", "coaching_yearly"])
      .not("user_id", "in", adminFilter),
    // 月別サブスク推移用
    supabase
      .from("subscriptions")
      .select("created_at")
      .not("user_id", "in", adminFilter),
    // トライアル関連（状態内訳用）
    supabase
      .from("subscriptions")
      .select("status, plan_id, current_period_end")
      .eq("plan_id", "trial")
      .not("user_id", "in", adminFilter),
    // 有料プランactive数（転換率の分子）
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .in("plan_id", ["pro_monthly", "pro_yearly", "coaching_monthly", "coaching_yearly"])
      .eq("status", "active")
      .not("user_id", "in", adminFilter),
    // 今月の解約数
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "canceled")
      .gte("updated_at", firstDayOfMonth)
      .not("user_id", "in", adminFilter),
    // 返金件数
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .not("refunded_at", "is", null)
      .not("user_id", "in", adminFilter),
    // プロジェクト総数
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .not("user_id", "in", adminFilter),
    // OpenRefineプロジェクト総数
    supabase
      .from("openrefine_projects")
      .select("*", { count: "exact", head: true })
      .not("user_id", "in", adminFilter),
    // プラン別内訳（active + trialing）
    supabase
      .from("subscriptions")
      .select("plan_id, plans(name)")
      .in("status", ["active", "trialing"])
      .not("user_id", "in", adminFilter),
  ]);

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
      const plans = row.plans as unknown as { name: string } | { name: string }[] | null;
      const plan = Array.isArray(plans) ? plans[0] : plans;
      const name = plan?.name ?? row.plan_id;
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
                有効サブスクリプション数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeSubscriptions ?? 0}</div>
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

      </main>
    </div>
  );
}
