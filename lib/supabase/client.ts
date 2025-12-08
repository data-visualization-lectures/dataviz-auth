import { createBrowserClient } from "@supabase/ssr";
import { CookieStorageAdapter } from "./storage-adapter";

// クライアント側で共有クッキー(Base64)を読み書きするアダプターを使用する
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(key) {
          return CookieStorageAdapter.getItem(key);
        },
        set(key, value, options) {
          CookieStorageAdapter.setItem(key, value);
        },
        remove(key, options) {
          CookieStorageAdapter.removeItem(key);
        },
      },
    }
  );
}
