import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale, t } from "@/lib/i18n.server";
import { DataLibraryClient } from "./components/data-library-client";
import { getToolAccessForUser } from "@/lib/tool-access";

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

  const { data: { session } } = await supabase.auth.getSession();
  const toolAccess = await getToolAccessForUser({
    supabase,
    userId: user.id,
    accessToken: session?.access_token,
  });

  const locale = await getLocale();

  if (!toolAccess.canUseTool) {
    const pricingUrl =
      locale === "en"
        ? "https://www.dataviz.jp/en/pricing/"
        : "https://www.dataviz.jp/pricing/";
    return redirect(pricingUrl);
  }

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
