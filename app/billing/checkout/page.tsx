import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout-form";

export const dynamic = "force-dynamic";

const VALID_PLANS = ["monthly", "yearly", "coaching_monthly", "coaching_yearly"] as const;
type PlanType = (typeof VALID_PLANS)[number];

function isValidPlan(plan: string | null): plan is PlanType {
  return plan !== null && (VALID_PLANS as readonly string[]).includes(plan);
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const plan: PlanType = isValidPlan(params.plan ?? null) ? params.plan! as PlanType : "monthly";

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

  // 有料契約中 → アカウントページにリダイレクト
  if (subscription?.status === "active") {
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
          defaultDisplayName={profile?.display_name ?? null}
          userId={user.id}
        />
      </div>
    </div>
  );
}
