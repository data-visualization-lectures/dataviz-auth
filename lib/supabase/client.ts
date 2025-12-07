import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

const COOKIE_DOMAIN = ".dataviz.jp";
const projectRef = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    return url.hostname.split(".")[0];
  } catch {
    return "supabase";
  }
})();
export const SUPABASE_STORAGE_KEY = `sb-${projectRef}-auth-token`;

const cookieStorage = {
  getItem: (key: string) => {
    if (typeof document === "undefined") return null;
    const match = document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${encodeURIComponent(key)}=`));
    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
  },
  setItem: (key: string, value: string) => {
    if (typeof document === "undefined") return;
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    const expires = 60 * 60 * 24 * 365; // 1年
    document.cookie = `${encodedKey}=${encodedValue}; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=${expires}; SameSite=Lax; Secure`;
  },
  removeItem: (key: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${encodeURIComponent(
      key,
    )}=; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=0; SameSite=Lax; Secure`;
  },
};

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: cookieStorage,
        storageKey: SUPABASE_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}

// 手動でセッションをCookieに書き込むフォールバック
export function persistSession(session: Session | null) {
  if (typeof document === "undefined" || !session) return;
  const expiresAt =
    session.expires_at ??
    (session.expires_in
      ? Math.round(Date.now() / 1000 + session.expires_in)
      : null);
  const payload = {
    currentSession: session,
    expiresAt,
  };
  const value = JSON.stringify(payload);
  const maxAge = session.expires_in ?? 60 * 60 * 24 * 7; // refresh前提で1週間
  document.cookie = `${encodeURIComponent(
    SUPABASE_STORAGE_KEY,
  )}=${encodeURIComponent(
    value,
  )}; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}
