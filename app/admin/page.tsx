import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserGrowthChart, SubscriptionGrowthChart } from "@/components/admin-charts";

export const dynamic = "force-dynamic";

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

  // 統計データ取得
  const [
    { count: totalUsers },
    { count: activeSubscriptions },
    { data: subscriptionsWithPlan },
    { data: profileRows },
    { data: subscriptionRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .neq("is_admin", true),
    supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "trialing"])
      .not("user_id", "in", `(${adminIds.join(",")})`),
    supabase
      .from("subscriptions")
      .select("plan_id, plans(amount)")
      .not("user_id", "in", `(${adminIds.join(",")})`),
    supabase
      .from("profiles")
      .select("created_at")
      .neq("is_admin", true),
    supabase
      .from("subscriptions")
      .select("created_at")
      .not("user_id", "in", `(${adminIds.join(",")})`),
  ]);

  // 累計売上
  const totalRevenue = (subscriptionsWithPlan ?? []).reduce((sum, sub) => {
    const plan = sub.plans as { amount: number } | null;
    return sum + (plan?.amount ?? 0);
  }, 0);

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

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                総ユーザー数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalUsers ?? 0}</div>
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
                累計売上
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalRevenue.toLocaleString()}円
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

      </main>
    </div>
  );
}
