import { redirect } from "next/navigation";
import { SavedProjectsGrid, type SavedProject } from "@/components/saved-projects-grid";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getLocale, t } from "@/lib/i18n.server";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: t(locale, "projects.title") };
}

export default async function ProjectsPage({
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

  if (hasEnvVars) {
    const [{ data }, { data: orData }] = await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("openrefine_projects")
        .select("id, name, archive_path, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
    ]);

    const projects: SavedProject[] = data
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

    const orProjects: SavedProject[] = (orData ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      app_name: "openrefine",
      updated_at: p.updated_at,
      storage_path: p.archive_path,
      thumbnail_path: null,
      signedUrl: null,
      source: "openrefine" as const,
    }));

    allProjects = [...projects, ...orProjects].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-0 max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight">{t(locale, "projects.title")}</h2>
            <p className="text-muted-foreground">
              {t(locale, "projects.description")}
            </p>
          </div>
          <SavedProjectsGrid projects={allProjects} initialFilter={initialTool} locale={locale} />
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
