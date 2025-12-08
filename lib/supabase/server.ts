import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const cookieOptions = {
    domain: ".dataviz.jp",
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
          try {
            // Get all cookies
            const allCookies = cookieStore.getAll();

            // Map them to handle decoding if necessary
            return allCookies.map((cookie) => {
              try {
                // Heuristic: If it decodes to JSON with specific structure
                const value0 = cookie.value;
                const decodedStr = Buffer.from(value0, "base64").toString("utf8");
                const decodedJson = JSON.parse(decodedStr);

                if (decodedJson.currentSession || decodedJson.expiresAt) {
                  const sess = decodedJson.currentSession;
                  return {
                    ...cookie,
                    value: typeof sess === "object" ? JSON.stringify(sess) : sess
                  };
                }
              } catch {
                // Not our custom base64 cookie, return as-is
              }

              return cookie;
            });
          } catch (e) {
            return cookieStore.getAll();
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Encode value to Base64 before setting
              try {
                let session;
                try {
                  session = JSON.parse(value);
                } catch {
                  session = value;
                }

                const now = Math.round(Date.now() / 1000);

                let expiresAt;
                let maxAge;

                // Determine expiration
                if (typeof session === "object" && session !== null && "expires_at" in session) {
                  expiresAt = session.expires_at ?? (now + 60 * 60 * 24 * 7);
                  maxAge = session.expires_in ?? 60 * 60 * 24 * 7;
                } else {
                  expiresAt = now + 60 * 60 * 24 * 7;
                  maxAge = 60 * 60 * 24 * 7;
                }

                const cookieValue = Buffer.from(JSON.stringify({
                  currentSession: session,
                  expiresAt
                })).toString("base64");

                // Override domain to .dataviz.jp explicitly if not set, or force it
                const newOptions = {
                  ...options,
                  domain: ".dataviz.jp",
                  sameSite: "lax" as const,
                  secure: true,
                  httpOnly: false,
                  maxAge
                };

                cookieStore.set(name, cookieValue, newOptions);
              } catch {
                // Should rarely happen if catch block above handles non-JSON
                cookieStore.set(name, value, {
                  ...options,
                  domain: ".dataviz.jp",
                  httpOnly: false
                });
              }
            });
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
      cookieOptions,
    },
  );
}
