import { createBrowserClient } from "@supabase/ssr";

const COOKIE_DOMAIN = ".dataviz.jp";

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
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}
