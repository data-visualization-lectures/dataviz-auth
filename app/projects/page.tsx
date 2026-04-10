import { redirect } from "next/navigation";
import { SavedProjectsGrid, type SavedProject } from "@/components/saved-projects-grid";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale, t } from "@/lib/i18n.server";

export async function generateMetadata() {
  const locale = await getLocale();
  return { title: t(locale, "projects.title") };
}

const PUBLIC_PROJECT_USER_ID = process.env.PUBLIC_PROJECT_USER_ID ?? "";

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

  // サブスクリプション＋管理者チェック（パブリックプロジェクト表示判定用）
  const [{ data: subscription }, { data: profile }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const isAdmin = !!profile?.is_admin;
  const isSubscribed =
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    new Date(subscription.current_period_end) > new Date();

  const showPublicProjects =
    (isAdmin || isSubscribed) &&
    !!PUBLIC_PROJECT_USER_ID &&
    user.id !== PUBLIC_PROJECT_USER_ID;

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
            return { ...p, signedUrl, source: "projects" as const, canDelete: true };
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
      canDelete: true,
    }));

    allProjects = [...projects, ...orProjects].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  // チームプロジェクト取得
  let groupProjects: SavedProject[] = [];
  try {
    const adminDb = createAdminClient();
    const { data: membership } = await adminDb
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (membership && membership.length > 0) {
      const groupIds = membership.map((m: any) => m.group_id);
      const { data: gProjects } = await adminDb
        .from("projects")
        .select("*")
        .in("group_id", groupIds)
        .not("group_id", "is", null)
        .order("updated_at", { ascending: false });

      if (gProjects) {
        groupProjects = await Promise.all(
          gProjects.map(async (p: any) => {
            let signedUrl = null;
            if (p.thumbnail_path) {
              const { data: signedData } = await adminDb.storage
                .from("user_projects")
                .createSignedUrl(p.thumbnail_path, 3600);
              signedUrl = signedData?.signedUrl || null;
            }
            return {
              ...p,
              signedUrl,
              source: "projects" as const,
              canDelete: p.user_id === user.id,
            };
          })
        );
      }
    }
  } catch (err) {
    console.error("Failed to fetch group projects:", err);
  }

  // パブリック・プロジェクト取得
  let publicProjects: SavedProject[] = [];
  if (showPublicProjects) {
    try {
      const adminDb = createAdminClient();
      const { data: pubData } = await adminDb
        .from("projects")
        .select("*")
        .eq("user_id", PUBLIC_PROJECT_USER_ID)
        .order("updated_at", { ascending: false });

      if (pubData) {
        publicProjects = await Promise.all(
          pubData.map(async (p: any) => {
            let signedUrl = null;
            if (p.thumbnail_path) {
              const { data: signedData } = await adminDb.storage
                .from("user_projects")
                .createSignedUrl(p.thumbnail_path, 3600);
              signedUrl = signedData?.signedUrl || null;
            }
            return {
              ...p,
              signedUrl,
              source: "projects" as const,
              canDelete: false,
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to fetch public projects:", err);
    }
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

          {groupProjects.length > 0 && (
            <>
              <div className="flex flex-col gap-2 mt-4">
                <h2 className="text-2xl font-bold tracking-tight">{t(locale, "projects.groupTitle")}</h2>
                <p className="text-muted-foreground">
                  {t(locale, "projects.groupDescription")}
                </p>
              </div>
              <SavedProjectsGrid projects={groupProjects} initialFilter={initialTool} locale={locale} />
            </>
          )}

          {publicProjects.length > 0 && (
            <>
              <div className="flex flex-col gap-2 mt-4">
                <h2 className="text-2xl font-bold tracking-tight">{t(locale, "projects.publicTitle")}</h2>
                <p className="text-muted-foreground">
                  {t(locale, "projects.publicDescription")}
                </p>
              </div>
              <SavedProjectsGrid projects={publicProjects} initialFilter={initialTool} locale={locale} />
            </>
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
