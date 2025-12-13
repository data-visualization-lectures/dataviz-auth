import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LayoutDashboard,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Fetch Subscription Data
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(`
      status,
      current_period_end,
      plan_id,
      cancel_at_period_end
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  console.log("DEBUG: Raw current_period_end:", subscription?.current_period_end);

  // Generate initials for avatar
  const email = user.email || "";

  // Format Date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "不明";
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const isCanceled = subscription?.cancel_at_period_end;

  // Determine product name from plan_id
  let productName = "プラン不明";
  const planId = subscription?.plan_id;

  if (planId === "pro_monthly") {
    productName = "dataviz.jp利用サブスク (月払い)";
  } else if (planId === "pro_yearly") {
    productName = "dataviz.jp利用サブスク (年払い)";
  } else if (isActive) {
    productName = "dataviz.jp利用サブスク";
  }

  const planName = isActive ? productName : "フリープラン";

  let planStatus = "未契約";
  let statusColor = "bg-gray-100 text-gray-700 border-gray-200";

  if (isActive) {
    if (isCanceled) {
      planStatus = "解約済 (期限まで有効)";
      statusColor = "bg-amber-100 text-amber-700 border-amber-200";
    } else {
      planStatus = "有効";
      statusColor = "bg-green-100 text-green-700 border-green-200";
    }
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
            <div className="flex flex-col gap-1">
              <div className="text-xl font-bold">{email}</div>
              <p className="text-sm text-muted-foreground">
                アカウント作成日: {formatDate(user.created_at)}
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
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {planStatus}
                  </span>
                </div>
                {isActive && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {isCanceled ? "有効期限" : "次回更新日"}: {formatDate(subscription?.current_period_end)}
                  </p>
                )}
              </div>
              <ManageSubscriptionButton isActive={isActive} />
            </div>
          </CardContent>
        </Card>

        {/* Link to Main Site */}
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer" >
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                ツール一覧へ戻る
              </h3>
              <p className="text-sm text-muted-foreground">
                すべてのツールは公式サイトから利用できます。
              </p>
            </div>
            <Button asChild>
              <a href="https://www.dataviz.jp">公式サイトを開く</a>
            </Button>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}