"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { createCheckoutSession, type PlanType } from "@/lib/apiClient";
import { toast } from "sonner";

const PLAN_DISPLAY: Record<PlanType, { name: string; price: string }> = {
  monthly: { name: "通常プラン（月額）", price: "¥2,480/月" },
  yearly: { name: "通常プラン（年額）", price: "¥24,800/年" },
  coaching_monthly: { name: "コーチングプラン（月額）", price: "¥6,980/月" },
  coaching_yearly: { name: "コーチングプラン（年額）", price: "¥69,800/年" },
};

export function CheckoutForm({
  plan,
  defaultDisplayName,
  userId,
}: {
  plan: PlanType;
  defaultDisplayName: string | null;
  userId: string;
}) {
  const [displayName, setDisplayName] = useState(defaultDisplayName ?? "");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planInfo = PLAN_DISPLAY[plan];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("表示名を入力してください");
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      setError("利用規約とプライバシーポリシーに同意してください");
      return;
    }

    setIsLoading(true);

    try {
      // profiles に display_name を保存
      const supabase = createClient();
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        throw new Error("プロフィールの保存に失敗しました");
      }

      // Stripe Checkout セッションを作成
      const data = await createCheckoutSession(plan);

      if (data && data.url) {
        window.location.href = data.url;
      } else if (data && data.error === "already_subscribed") {
        toast.info("既に契約済みです。アカウントページへ移動します。");
        window.location.href = data.redirect_url || "/account";
      } else {
        throw new Error("チェックアウトセッションの作成に失敗しました");
      }
    } catch (err: any) {
      setError(err.message ?? "エラーが発生しました");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">お申し込み</CardTitle>
        <CardDescription>
          プラン情報を確認し、必要事項を入力してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            {/* プラン情報 */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">選択中のプラン</div>
              <div className="mt-1 text-lg font-semibold">{planInfo.name}</div>
              <div className="text-2xl font-bold text-primary">{planInfo.price}</div>
            </div>

            {/* 表示名 */}
            <div className="grid gap-2">
              <Label htmlFor="displayName">表示名</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="例: 田中太郎"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                サービス内で表示される名前です
              </p>
            </div>

            {/* 利用規約・プライバシーポリシー */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) =>
                    setAgreedToTerms(checked === true)
                  }
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  <Link
                    href="https://www.dataviz.jp/terms/"
                    target="_blank"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    利用規約
                  </Link>
                  に同意する
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="privacy"
                  checked={agreedToPrivacy}
                  onCheckedChange={(checked) =>
                    setAgreedToPrivacy(checked === true)
                  }
                />
                <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
                  <Link
                    href="https://www.dataviz.jp/privacy/"
                    target="_blank"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    プライバシーポリシー
                  </Link>
                  に同意する
                </Label>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "処理中..." : "決済に進む"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
