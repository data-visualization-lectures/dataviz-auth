// lib/apiClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // https://api.dataviz.jp

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function callApi(
  path: string,
  options: RequestInit = {}
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchMe() {
  return callApi("/api/me");
}

export async function createCheckoutSession() {
  return callApi("/api/billing/create-checkout-session", { method: "POST" });
}

export async function createPortalSession() {
  return callApi("/api/billing/create-portal-session", { method: "POST" });
}