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

const encodeBase64 = (value: string) => {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return null;
  }
};

const decodeBase64 = (value: string | null | undefined) => {
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

const storage = {
  getItem: (key: string) => {
    const rawCookie = getCookieValue(key);
    const decodedCookie = decodeBase64(rawCookie);
    if (decodedCookie) return decodedCookie;
    // フォールバックで localStorage も見る
    if (typeof localStorage !== "undefined") {
      const rawLocal = localStorage.getItem(key);
      if (rawLocal) {
        const decodedLocal = decodeBase64(rawLocal);
        if (decodedLocal) return decodedLocal;
        return rawLocal; // もともと平文の場合
      }
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    const encoded = encodeBase64(value);
    if (!encoded) return;
    const encodedKey = encodeURIComponent(key);
    const maxAge = 60 * 60 * 24 * 365;
    if (typeof document !== "undefined") {
      document.cookie = `${encodedKey}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
      document.cookie = `${encodedKey}=${encoded}; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=${maxAge}; SameSite=Lax; Secure`;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    const encodedKey = encodeURIComponent(key);
    if (typeof document !== "undefined") {
      document.cookie = `${encodedKey}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
      document.cookie = `${encodedKey}=; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=0; SameSite=Lax; Secure`;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  },
};

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage,
        storageKey: STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}
