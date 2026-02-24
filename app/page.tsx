import { Hero } from "@/components/hero";

import { SavedProjectsGrid, type SavedProject } from "@/components/saved-projects-grid"; // Import component
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server"; // Import createClient

export default async function Home({
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

  let projects: SavedProject[] = [];

  if (user && hasEnvVars) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (data) {
      projects = await Promise.all(
        data.map(async (p) => {
          let signedUrl = null;
          if (p.thumbnail_path) {
            const { data: signedData } = await supabase.storage
              .from("user_projects")
              .createSignedUrl(p.thumbnail_path, 3600); // 1 hour validity
            signedUrl = signedData?.signedUrl || null;
          }
          return { ...p, signedUrl } as SavedProject;
        })
      );
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-8 md:p-0 max-w-5xl mx-auto w-full">
        {user ? (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-tight">保存プロジェクト一覧</h2>
              <p className="text-muted-foreground">
                【クローズド・テスト中】さまざまなツールから保存したプロジェクトへアクセスできます。
              </p>
            </div>
            <SavedProjectsGrid projects={projects} initialFilter={initialTool} />
          </div>
        ) : (
          <Hero />
        )}
      </main>

      <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
        <p>
          Powered by{" "}
          <a
            href="https://visualizing.jp/"
            target="_blank"
            className="font-bold hover:underline"
            rel="noreferrer"
          >
            Visualizing.JP
          </a>
        </p>
      </footer>
    </div>
  );
}
