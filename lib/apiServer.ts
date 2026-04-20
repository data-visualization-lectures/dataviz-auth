import { createClient } from "@/lib/supabase/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dataviz.jp";

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function callApiServer<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${detail}`);
  }

  return res.json() as Promise<T>;
}

export type ApiProject = {
  id: string;
  name: string;
  app_name: string;
  thumbnail_path: string | null;
  storage_path: string;
  user_id: string;
  group_id: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectListOptions = {
  app?: string;
  source?: "public" | "group";
};

export async function fetchProjects(
  options: ProjectListOptions = {},
): Promise<ApiProject[]> {
  const params = new URLSearchParams();
  if (options.app) params.set("app", options.app);
  if (options.source) params.set("source", options.source);
  const qs = params.toString();
  const path = qs ? `/api/projects?${qs}` : `/api/projects`;
  const result = await callApiServer<{ projects: ApiProject[] }>(path);
  return result.projects ?? [];
}

export async function fetchProjectCount(options: { app?: string } = {}): Promise<number> {
  const params = new URLSearchParams({ mode: "count" });
  if (options.app) params.set("app", options.app);
  const result = await callApiServer<{ count: number }>(
    `/api/projects?${params.toString()}`,
  );
  return result.count ?? 0;
}
