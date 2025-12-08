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

export const STORAGE_KEY = `sb-${projectRef}-auth-token`;

const encode = (value: string) => {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return null;
  }
};

const decode = (value: string | undefined | null) => {
  if (!value) return null;
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return null;
  }
};

const getCookieValue = (key: string) => {
  if (typeof document === "undefined") return null;
  const encodedKey = encodeURIComponent(key);
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${encodedKey}=`));
  return match ? match.split("=").slice(1).join("=") : null;
};

const cookieStorage = {
  getItem: (key: string) => {
    const raw = getCookieValue(key);
    return decode(raw);
  },
  setItem: (key: string, value: string) => {
    if (typeof document === "undefined") return;
    const encoded = encode(value);
    if (!encoded) return;
    const encodedKey = encodeURIComponent(key);
    const maxAge = 60 * 60 * 24 * 365;
    // hostスコープ
    document.cookie = `${encodedKey}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
    // ドメイン共有
    document.cookie = `${encodedKey}=${encoded}; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=${maxAge}; SameSite=Lax; Secure`;
  },
  removeItem: (key: string) => {
    if (typeof document === "undefined") return;
    const encodedKey = encodeURIComponent(key);
    document.cookie = `${encodedKey}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    document.cookie = `${encodedKey}=; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=0; SameSite=Lax; Secure`;
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
