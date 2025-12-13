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

  // Determine if we are in a local environment
  const isLocal = process.env.NODE_ENV === "development";

  const cookieOptions = {
    // Share cookie across subdomains in production for SSO
    domain: isLocal ? undefined : APP_CONFIG.DOMAIN,
    sameSite: "lax" as const,
    secure: !isLocal,
    httpOnly: false,
    name: APP_CONFIG.COOKIE_NAME,
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) => {
              // Remove 'name' from the options passed to cookieStore.set
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { name: _, ...optionsToSet } = cookieOptions;
              cookieStore.set(name, value, {
                ...options,
                ...optionsToSet,
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
