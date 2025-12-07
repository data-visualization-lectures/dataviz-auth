// app/billing/success/page.tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function BillingSuccessPage() {
  // 数秒後に /account へ自動遷移したい場合
  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = "/account";
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">決済が完了しました</CardTitle>
            <CardDescription>
              サブスクリプション情報を更新しています。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              数秒後にアカウントページへ自動的に移動します。
              すぐに確認したい場合は、下のボタンを押してください。
            </p>
            <Button asChild>
              <Link href="/account">アカウントページへ移動</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}