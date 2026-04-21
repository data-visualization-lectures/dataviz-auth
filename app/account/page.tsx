import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchProjectCount } from "@/lib/apiServer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { DeleteAccountButton } from "@/components/delete-account-button";

import { EditDisplayName } from "@/components/edit-display-name";
import { ChangePasswordButton } from "@/components/change-password-button";
import { ChangeEmailForm } from "@/components/change-email-form";
import { getLocale, t, formatDateLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: t(locale, "account.title") };
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  const locale = await getLocale();

  // Fetch Subscription, Plans, Profile, and Project Counts
  const [
    { data: subscription },
    { data: plans },
    { data: profile },
    projectCount,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end, plan_id, cancel_at_period_end, refunded_at, stripe_subscription_id, created_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("id, name, name_en, amount"),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    fetchProjectCount().catch(() => 0),
  ]);

  const email = user.email || "";

  const providerLabels: Record<string, string> = {
    email: t(locale, "account.providerEmail"),
    google: "Google",
  };
  const loginMethods = user.identities
    ?.map((i) => providerLabels[i.provider] ?? i.provider)
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .join(t(locale, "account.providerSeparator")) || t(locale, "account.providerUnknown");

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const isCanceled = subscription?.cancel_at_period_end;

  const currentPlan = plans?.find((p) => p.id === subscription?.plan_id);
  const planDisplayName = currentPlan
    ? (locale === "en" && currentPlan.name_en ? currentPlan.name_en : currentPlan.name)
    : null;

  const planName = isActive
    ? (planDisplayName ?? t(locale, "account.defaultPlanName"))
    : t(locale, "account.freePlan");

  const planAmount = isActive && currentPlan?.amount
    ? locale === "ja"
      ? `${currentPlan.amount.toLocaleString()}円`
      : `¥${currentPlan.amount.toLocaleString()}`
    : null;

  const hasEmailLogin = user.identities?.some((i) => i.provider === "email");
  const totalProjects = projectCount ?? 0;

  let planStatus = t(locale, "account.statusNone");
  let statusColor = "bg-gray-100 text-gray-700 border-gray-200";

  if (isActive) {
    if (isCanceled) {
      planStatus = t(locale, "account.statusCanceled");
      statusColor = "bg-amber-100 text-amber-700 border-amber-200";
    } else if (subscription?.status === "trialing") {
      planStatus = t(locale, "account.statusTrialing");
      statusColor = "bg-blue-100 text-blue-700 border-blue-200";
    } else {
      planStatus = t(locale, "account.statusActive");
      statusColor = "bg-green-100 text-green-700 border-green-200";
    }
  } else if (subscription?.status === "canceled") {
    planStatus = t(locale, "account.statusExpired");
    statusColor = "bg-red-100 text-red-700 border-red-200";
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">

      {/* Main Content */}
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-0 max-w-5xl mx-auto w-full">

        {/* Welcome Banner */}
        <div className="flex flex-col gap-2 mb-4">
          <h2 className="text-3xl font-bold tracking-tight">{t(locale, "account.title")}</h2>
          <p className="text-muted-foreground">
            {t(locale, "account.description")}
          </p>
        </div>

        {/* Top 2-column: User Info + Subscription */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* User Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, "account.userInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="text-xl font-bold">{email}</div>
                <EditDisplayName userId={user.id} initialName={profile?.display_name ?? null} locale={locale} />
                <p className="text-sm text-muted-foreground">
                  {t(locale, "account.createdAt")}: {formatDateLocale(locale, user.created_at)}
                </p>
                <ChangeEmailForm currentEmail={email} locale={locale} />
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, "account.currentPlan")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                    {planName}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {planStatus}
                    </span>
                  </div>
                  {planAmount && (
                    <p className="text-base text-muted-foreground mt-1">
                      {planAmount} / {subscription?.plan_id?.includes("yearly") ? t(locale, "account.yearly") : t(locale, "account.monthly")}
                    </p>
                  )}
                  {isActive && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {subscription?.status === "trialing"
                        ? t(locale, "account.trialEnd")
                        : isCanceled
                          ? t(locale, "account.validUntil")
                          : t(locale, "account.nextRenewal")
                      }: {formatDateLocale(locale, subscription?.current_period_end)}
                    </p>
                  )}
                </div>
                {subscription?.plan_id !== "academia" && (
                  <div className="flex flex-col gap-2">
                    <ManageSubscriptionButton isActive={isActive && subscription?.status !== "trialing"} locale={locale} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2-column: Login Info + Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Login Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, "account.loginInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  {t(locale, "account.lastLogin")}: {formatDateLocale(locale, user.last_sign_in_at ?? undefined)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(locale, "account.loginMethod")}: {loginMethods}
                </p>
                {hasEmailLogin && <ChangePasswordButton email={email} locale={locale} />}
              </div>
            </CardContent>
          </Card>

          {/* Project Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, "account.projectInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {totalProjects}{t(locale, "account.projectCount")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact */}
        {isActive && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, "account.contact")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={locale === "en" ? "https://forms.gle/9fbiZKxsfCMmARwk7" : "https://forms.gle/UDquMjQ3ieqFH9s39"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground hover:no-underline"
              >
                {t(locale, "account.contactLink")}
              </a>
            </CardContent>
          </Card>
        )}

        {/* Group Info */}
        <GroupInfoCard userId={user.id} locale={locale} />

        {/* Delete Account */}
        <div className="flex justify-end">
          <DeleteAccountButton locale={locale} />
        </div>

      </main>

      <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
        <p>
          Powered by{" "}
          <a
            href="https://notation.co.jp/"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            notation.co.jp
          </a>
        </p>
      </footer>
    </div>
  );
}

async function GroupInfoCard({ userId, locale }: { userId: string; locale: import("@/lib/i18n").Locale }) {
  const adminDb = createAdminClient();
  const { data: memberships } = await adminDb
    .from("group_members")
    .select("group_id, role, groups(name)")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return null;

  return (
    <>
      {memberships.map((m: any) => {
        const group = m.groups;
        return (
          <Card key={m.group_id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(locale, "account.groupInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="text-xl font-bold">{group?.name}</div>
                <p className="text-sm text-muted-foreground">
                  {t(locale, "account.groupRole")}: {m.role === "owner" ? t(locale, "account.groupRoleOwner") : t(locale, "account.groupRoleMember")}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
