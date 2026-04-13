import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuthedAdmin = {
  id: string;
  email: string;
};

async function fetchAuthedAdmin(): Promise<AuthedAdmin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return null;
  return { id: user.id, email: user.email ?? "" };
}

export async function requireAdminForPage(): Promise<AuthedAdmin> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect("/account");
  }

  return { id: user.id, email: user.email ?? "" };
}

export async function requireAdminForAction(): Promise<AuthedAdmin> {
  const admin = await fetchAuthedAdmin();
  if (!admin) {
    throw new Error("Forbidden");
  }
  return admin;
}
