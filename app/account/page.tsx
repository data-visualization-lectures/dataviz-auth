import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { CancelAndRefundButton } from "@/components/cancel-and-refund-button";
import { EditDisplayName } from "@/components/edit-display-name";
import { ChangePasswordButton } from "@/components/change-password-button";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Fetch Subscription, Plans, Profile, and Project Counts
  const [
    { data: subscription },
    { data: plans },
    { data: profile },
    { count: projectCount },
    { count: orProjectCount },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end, plan_id, cancel_at_period_end, refunded_at, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("id, name, amount"),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("openrefine_projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const email = user.email || "";

  // ログイン方法の表示名マッピング
  const providerLabels: Record<string, string> = {
    email: "メール / パスワード",
    google: "Google",
  };
  const loginMethods = user.identities
    ?.map((i) => providerLabels[i.provider] ?? i.provider)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .join("、") || "不明";

  // Format Date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "不明";
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Tokyo"
    });
  };

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const isCanceled = subscription?.cancel_at_period_end;

  const currentPlan = plans?.find((p) => p.id === subscription?.plan_id);
  const planDisplayName = currentPlan?.name ?? null;

  const planName = isActive
    ? (planDisplayName ?? "dataviz.jp利用サブスク")
    : "フリープラン";

  const planAmount = isActive && currentPlan?.amount
    ? `${currentPlan.amount.toLocaleString()}円`
    : null;

  const hasEmailLogin = user.identities?.some((i) => i.provider === "email");
  const totalProjects = (projectCount ?? 0) + (orProjectCount ?? 0);

  let planStatus = "未契約";
  let statusColor = "bg-gray-100 text-gray-700 border-gray-200";

  if (isActive) {
    if (isCanceled) {
      planStatus = "解約済 (期限まで有効)";
      statusColor = "bg-amber-100 text-amber-700 border-amber-200";
    } else if (subscription?.status === "trialing") {
      planStatus = "トライアル中";
      statusColor = "bg-blue-100 text-blue-700 border-blue-200";
    } else {
      planStatus = "有効";
      statusColor = "bg-green-100 text-green-700 border-green-200";
    }
  } else if (subscription?.status === "canceled") {
    planStatus = "契約終了";
    statusColor = "bg-red-100 text-red-700 border-red-200";
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">

      {/* Main Content */}
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-0 max-w-5xl mx-auto w-full">

        {/* Welcome Banner */}
        <div className="flex flex-col gap-2 mb-4">
          <h2 className="text-3xl font-bold tracking-tight">アカウント情報</h2>
          <p className="text-muted-foreground">
            契約プランやプロフィールの管理を行えます。
          </p>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ユーザー情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="text-xl font-bold">{email}</div>
              <EditDisplayName userId={user.id} initialName={profile?.display_name ?? null} />
              <p className="text-sm text-muted-foreground">
                アカウント作成日: {formatDate(user.created_at)}
              </p>
              <p className="text-sm text-muted-foreground">
                最終ログイン: {formatDate(user.last_sign_in_at ?? undefined)}
              </p>
              <p className="text-sm text-muted-foreground">
                ログイン方法: {loginMethods}
              </p>
              {hasEmailLogin && <ChangePasswordButton email={email} />}
            </div>
          </CardContent>
        </Card>

        {/* Project Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              プロジェクト情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                保存プロジェクト数: {totalProjects}件
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              現在のプラン
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {planName}
                  {planAmount && (
                    <span className="text-base font-normal text-muted-foreground">
                      ({planAmount} / {subscription?.plan_id?.includes("yearly") ? "年" : "月"})
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {planStatus}
                  </span>
                </div>
                {isActive && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {subscription?.status === "trialing"
                      ? "トライアル終了日"
                      : isCanceled
                        ? "有効期限"
                        : "次回更新日"
                    }: {formatDate(subscription?.current_period_end)}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end">
                <ManageSubscriptionButton isActive={isActive && subscription?.status !== "trialing"} />
                {subscription?.status === "active"
                  && subscription?.stripe_subscription_id
                  && !subscription?.refunded_at && (
                  <CancelAndRefundButton />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <div className="flex justify-end">
          <DeleteAccountButton />
        </div>

      </main>

      <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
        <p>
          Powered by{" "}
          <a
            href="https://visualizing.jp/"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            Visualizing.JP
          </a>
        </p>
      </footer>
    </div>
  );
}
