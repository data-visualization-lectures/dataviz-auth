import { createBrowserClient } from "@supabase/ssr";
import { APP_CONFIG } from "@/lib/config";


// クライアント側で共有クッキーを読み書きする場合も、
// Domain指定を入れた標準的な実装に戻す。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        domain: process.env.NODE_ENV === "development" ? undefined : APP_CONFIG.DOMAIN,
        sameSite: (process.env.NODE_ENV === "development" ? "lax" : "none") as "lax" | "none" | "strict",
        secure: process.env.NODE_ENV !== "development",
        httpOnly: false,
        name: APP_CONFIG.COOKIE_NAME,
      }
    }
  );
}
