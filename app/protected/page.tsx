import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  User
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function DashboardPage() {
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
      prices (
        products (
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .single();

  // Generate initials for avatar
  const email = user.email || "";
  const initials = email.substring(0, 2).toUpperCase();

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

  // Extract product name safely
  // @ts-ignore: Nested relationships might not be fully typed in the automatic client
  const productName = subscription?.prices?.products?.name ?? "プラン不明";

  const planName = isActive ? productName : "フリープラン";
  const planStatus = isActive ? "有効" : "未契約";
  const statusColor = isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      {/* Header removed to avoid duplication */}

      {/* Main Content */}
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-0 max-w-5xl mx-auto w-full">

        {/* Welcome Banner */}
        <div className="flex flex-col gap-2 mb-4">
          <h2 className="text-3xl font-bold tracking-tight">アカウント情報</h2>
          <p className="text-muted-foreground">
            契約プランやプロフィールの管理を行えます。
          </p>
        </div>

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
                    次回更新日: {formatDate(subscription?.current_period_end)}
                  </p>
                )}
              </div>
              <Button variant="outline" asChild>
                <Link href="/account">契約内容の変更</Link>
              </Button>
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
