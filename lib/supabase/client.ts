import { createBrowserClient } from "@supabase/ssr";

// Supabase公式のデフォルト（localStorage）に戻す
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
