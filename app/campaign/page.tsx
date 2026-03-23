import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyTrialToExistingUser } from "@/lib/auth-utils";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  // コードがない場合
  if (!code) {
    return <CampaignResult status="no_code" />;
  }

  // ログイン確認
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // 未ログイン → ログインページへリダイレクト（コードを保持）
    const redirectTo = `/campaign?code=${encodeURIComponent(code)}`;
    redirect(`/auth/login?redirect_to=${encodeURIComponent(redirectTo)}`);
  }

  // トライアル適用
  const result = await applyTrialToExistingUser(user.id, code);

  if (result.success) {
    return <CampaignResult status="success" />;
  }

  return <CampaignResult status={result.reason} />;
}

function CampaignResult({ status }: { status: string }) {
  const toolUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.dataviz.jp";

  if (status === "success") {
    return (
      <ResultLayout>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">トライアルが適用されました</CardTitle>
            <CardDescription>
              14日間、すべての機能を無料でご利用いただけます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              トライアル期間中は、有料プランと同じ機能をお試しいただけます。
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href={toolUrl}>ツールを使う</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/account">アカウントページ</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </ResultLayout>
    );
  }

  if (status === "already_active") {
    return (
      <ResultLayout>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">既に有効なプランがあります</CardTitle>
            <CardDescription>
              現在ご利用中のサブスクリプションが有効なため、キャンペーンコードの適用は不要です。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button asChild>
                <Link href={toolUrl}>ツールを使う</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/account">アカウントページ</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </ResultLayout>
    );
  }

  if (status === "invalid_code") {
    return (
      <ResultLayout>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">無効なコードです</CardTitle>
            <CardDescription>
              キャンペーンコードが正しくありません。URLをご確認ください。
            </CardDescription>
          </CardHeader>
        </Card>
      </ResultLayout>
    );
  }

  // no_code, fetch_error, update_error, insert_error, unexpected_error
  return (
    <ResultLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">エラーが発生しました</CardTitle>
          <CardDescription>
            キャンペーンコードの適用に失敗しました。URLをご確認の上、再度お試しください。
          </CardDescription>
        </CardHeader>
      </Card>
    </ResultLayout>
  );
}

function ResultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
