import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout-form";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

const VALID_PLANS = [
  "monthly", "yearly",
  "coaching_monthly", "coaching_yearly",
  "team_small_monthly", "team_small_yearly",
  "team_standard_monthly", "team_standard_yearly",
  "team_enterprise_monthly", "team_enterprise_yearly",
] as const;
type PlanType = (typeof VALID_PLANS)[number];

function isValidPlan(plan: string | null): plan is PlanType {
  return plan !== null && (VALID_PLANS as readonly string[]).includes(plan);
}

type CurrencyType = "jpy" | "usd";
function isValidCurrency(c: string | null): c is CurrencyType {
  return c === "jpy" || c === "usd";
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; currency?: string }>;
}) {
  const params = await searchParams;
  const plan: PlanType = isValidPlan(params.plan ?? null) ? params.plan! as PlanType : "monthly";
  const currency: CurrencyType = isValidCurrency(params.currency ?? null) ? (params.currency as CurrencyType) : "jpy";
  // USD決済は英語UI、それ以外はAccept-Languageベース
  const locale = currency === "usd" ? "en" : await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログイン → サインアップにリダイレクト
  if (!user) {
    const redirectTo = `/billing/checkout?plan=${plan}`;
    return redirect(`/auth/sign-up?redirect_to=${encodeURIComponent(redirectTo)}`);
  }

  // サブスクリプション状態を確認
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  // 有料契約中 → アカウントページにリダイレクト（チームプランへのアップグレードは許可）
  if (subscription?.status === "active" && !plan.startsWith("team_")) {
    return redirect("/account");
  }

  // profiles から display_name を取得（初期値用）
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <CheckoutForm
          plan={plan}
          currency={currency}
          locale={locale}
          defaultDisplayName={profile?.display_name ?? null}
          userId={user.id}
        />
      </div>
    </div>
  );
}
