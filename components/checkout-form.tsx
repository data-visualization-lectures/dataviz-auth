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
import { createCheckoutSession, type PlanType, type CurrencyType } from "@/lib/apiClient";
import { toast } from "sonner";
import { t, type Locale } from "@/lib/i18n";
import { trackCheckoutStarted } from "@/lib/analytics/events";

function extractPriceNumber(priceLabel: string): number {
  const digits = priceLabel.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

const PLAN_DISPLAY_JPY: Record<PlanType, { name: string; price: string }> = {
  monthly: { name: "通常プラン（月額）", price: "¥2,480/月" },
  yearly: { name: "通常プラン（年額）", price: "¥24,800/年" },
  coaching_monthly: { name: "コーチングプラン（月額）", price: "¥6,980/月" },
  coaching_yearly: { name: "コーチングプラン（年額）", price: "¥69,800/年" },
  team_small_monthly: { name: "チーム・スモール（月額）", price: "¥10,800/月" },
  team_small_yearly: { name: "チーム・スモール（年額）", price: "¥108,000/年" },
  team_standard_monthly: { name: "チーム・スタンダード（月額）", price: "¥19,800/月" },
  team_standard_yearly: { name: "チーム・スタンダード（年額）", price: "¥198,000/年" },
  team_enterprise_monthly: { name: "チーム・エンタープライズ（月額）", price: "¥52,000/月" },
  team_enterprise_yearly: { name: "チーム・エンタープライズ（年額）", price: "¥520,000/年" },
};

const PLAN_DISPLAY_USD: Partial<Record<PlanType, { name: string; price: string }>> = {
  monthly: { name: "Standard Plan (Monthly)", price: "$17/mo" },
  yearly: { name: "Standard Plan (Yearly)", price: "$169/yr" },
  team_small_monthly: { name: "Small Team Plan (Monthly)", price: "$72/mo" },
  team_small_yearly: { name: "Small Team Plan (Yearly)", price: "$720/yr" },
  team_standard_monthly: { name: "Team Plan (Monthly)", price: "$129/mo" },
  team_standard_yearly: { name: "Team Plan (Yearly)", price: "$1,290/yr" },
  team_enterprise_monthly: { name: "Group Plan (Monthly)", price: "$349/mo" },
  team_enterprise_yearly: { name: "Group Plan (Yearly)", price: "$3,490/yr" },
};

export function CheckoutForm({
  plan,
  currency = "jpy",
  locale = "ja",
  defaultDisplayName,
  userId,
}: {
  plan: PlanType;
  currency?: CurrencyType;
  locale?: Locale;
  defaultDisplayName: string | null;
  userId: string;
}) {
  const [displayName, setDisplayName] = useState(defaultDisplayName ?? "");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planInfo =
    currency === "usd" ? PLAN_DISPLAY_USD[plan] ?? PLAN_DISPLAY_JPY[plan] : PLAN_DISPLAY_JPY[plan];

  const termsUrl =
    locale === "en" ? "https://www.dataviz.jp/en/terms/" : "https://www.dataviz.jp/terms/";
  const privacyUrl =
    locale === "en" ? "https://www.dataviz.jp/en/privacy/" : "https://www.dataviz.jp/privacy/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError(t(locale, "checkout.errorNoName"));
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      setError(t(locale, "checkout.errorNoAgreement"));
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        display_name: displayName.trim(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        throw new Error(t(locale, "checkout.errorProfileSave"));
      }

      trackCheckoutStarted(plan, extractPriceNumber(planInfo.price), currency);

      const data = await createCheckoutSession(plan, currency);

      if (data && data.url) {
        window.location.href = data.url;
      } else if (data && data.error === "already_subscribed") {
        toast.info(t(locale, "checkout.alreadySubscribed"));
        window.location.href = data.redirect_url || "/account";
      } else {
        throw new Error(t(locale, "checkout.errorSession"));
      }
    } catch (err: any) {
      setError(err.message ?? t(locale, "checkout.errorGeneric"));
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t(locale, "checkout.title")}</CardTitle>
        <CardDescription>{t(locale, "checkout.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="text-sm text-muted-foreground">
                {t(locale, "checkout.selectedPlan")}
              </div>
              <div className="mt-1 text-lg font-semibold">{planInfo.name}</div>
              <div className="text-2xl font-bold text-primary">{planInfo.price}</div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayName">{t(locale, "checkout.displayNameLabel")}</Label>
              <Input
                id="displayName"
                type="text"
                placeholder={t(locale, "checkout.displayNamePlaceholder")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t(locale, "checkout.displayNameHelp")}
              </p>
            </div>

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
                  {t(locale, "checkout.agreeToTermsBefore")}
                  <Link
                    href={termsUrl}
                    target="_blank"
                    className="underline underline-offset-4 hover:text-primary hover:no-underline"
                  >
                    {t(locale, "checkout.termsLink")}
                  </Link>
                  {t(locale, "checkout.agreeToTermsAfter")}
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
                  {t(locale, "checkout.agreeToPrivacyBefore")}
                  <Link
                    href={privacyUrl}
                    target="_blank"
                    className="underline underline-offset-4 hover:text-primary hover:no-underline"
                  >
                    {t(locale, "checkout.privacyLink")}
                  </Link>
                  {t(locale, "checkout.agreeToPrivacyAfter")}
                </Label>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t(locale, "checkout.submitting") : t(locale, "checkout.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
