import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Especialy important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
import { APP_CONFIG } from "@/lib/config";

// ...

export async function createClient() {
  const cookieStore = await cookies();
  const isLocal = process.env.NODE_ENV === "development";

  const cookieOptions = {
    domain: isLocal ? undefined : APP_CONFIG.DOMAIN,
    sameSite: "lax" as const,
    secure: true,
    httpOnly: false,
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                ...cookieOptions,
              });
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      cookieOptions,
    },
  );
}
