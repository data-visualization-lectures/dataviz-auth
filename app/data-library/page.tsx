import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale, t } from "@/lib/i18n.server";
import { DataLibraryClient } from "./components/data-library-client";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: t(locale, "dataLibrary.title") };
}

export default async function DataLibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const isActive =
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    new Date(subscription.current_period_end) > new Date();

  if (!isActive) {
    return redirect("/pricing");
  }

  const locale = await getLocale();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-0 max-w-6xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {t(locale, "dataLibrary.title")}
            </h2>
            <p className="text-muted-foreground">
              {t(locale, "dataLibrary.description")}
            </p>
          </div>
          <DataLibraryClient locale={locale} />
        </div>
      </main>
    </div>
  );
}
