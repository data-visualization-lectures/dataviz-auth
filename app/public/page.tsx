import { redirect } from "next/navigation";
import { SavedProjectsGrid, type SavedProject } from "@/components/saved-projects-grid";
import { createClient } from "@/lib/supabase/server";
import { getLocale, t } from "@/lib/i18n.server";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: t(locale, "public.title") };
}

const PUBLIC_PROJECT_USER_ID = process.env.PUBLIC_PROJECT_USER_ID ?? "";

export default async function PublicProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string }>;
}) {
  const params = await searchParams;
  const initialTool = params.tool || "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  const locale = await getLocale();

  let allProjects: SavedProject[] = [];

  if (PUBLIC_PROJECT_USER_ID) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", PUBLIC_PROJECT_USER_ID)
      .order("updated_at", { ascending: false });

    allProjects = data
      ? await Promise.all(
          data.map(async (p) => {
            let signedUrl = null;
            if (p.thumbnail_path) {
              const { data: signedData } = await supabase.storage
                .from("user_projects")
                .createSignedUrl(p.thumbnail_path, 3600);
              signedUrl = signedData?.signedUrl || null;
            }
            return { ...p, signedUrl, source: "projects" as const };
          })
        )
      : [];
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-0 max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight">{t(locale, "public.title")}</h2>
            <p className="text-muted-foreground">
              {t(locale, "public.description")}
            </p>
          </div>
          {allProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>{t(locale, "public.empty")}</p>
            </div>
          ) : (
            <SavedProjectsGrid projects={allProjects} initialFilter={initialTool} locale={locale} readOnly={user.id !== PUBLIC_PROJECT_USER_ID} />
          )}
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
