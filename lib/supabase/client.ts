import { createBrowserClient } from "@supabase/ssr";

// デフォルトの永続化設定（localStorage）に戻してログイン安定を優先
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
