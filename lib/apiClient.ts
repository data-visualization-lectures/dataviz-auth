// ✅ テンプレ付属のブラウザ用クライアントを使う版
import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

async function getAccessToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function callApi(path: string, options: RequestInit = {}) {
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
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function fetchMe() {
  return callApi("/api/me");
}

export type PlanType = "monthly" | "yearly" | "coaching_monthly" | "coaching_yearly";

export async function createCheckoutSession(plan: PlanType = "monthly") {
  return callApi("/api/billing-create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
}

export async function createPortalSession() {
  return callApi("/api/billing-create-portal-session", { method: "POST" });
}

export async function deleteAccount() {
  return callApi("/api/delete-account", { method: "POST" });
}

export async function cancelAndRefund() {
  return callApi("/api/billing-cancel-and-refund", { method: "POST" });
}