import { createBrowserClient } from "@supabase/ssr";

const COOKIE_DOMAIN = ".dataviz.jp";

const projectRef = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    return url.hostname.split(".")[0];
  } catch {
    return "supabase";
  }
})();
const STORAGE_KEY = `sb-${projectRef}-auth-token`;

const cookieStorage = {
  getItem: (key: string) => {
    if (typeof document === "undefined") return null;
    const encodedKey = encodeURIComponent(key);
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${encodedKey}=`));
    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
  },
  setItem: (key: string, value: string) => {
    if (typeof document === "undefined") return;
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    const maxAge = 60 * 60 * 24 * 365; // 1年
    // eTLD+1 で共有。ホストスコープが残らないよう domain を付けて発行
    document.cookie = `${encodedKey}=${encodedValue}; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=${maxAge}; SameSite=Lax; Secure`;
  },
  removeItem: (key: string) => {
    if (typeof document === "undefined") return;
    const encodedKey = encodeURIComponent(key);
    // domain付きとホストスコープの両方を削除
    document.cookie = `${encodedKey}=; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=0; SameSite=Lax; Secure`;
    document.cookie = `${encodedKey}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  },
};

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: cookieStorage,
        storageKey: STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}
