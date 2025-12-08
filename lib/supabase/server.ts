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
              // Try to see if this cookie is our session cookie and if it is Base64
              // Actually, simply checking if it's Base64 decodable to JSON is a bit risky for all cookies,
              // but Supabase only looks for its specific key.
              // So we can try to decode specific keys if we knew them, but here we iterate generic keys.

              // However, since we are changing the implementation details, 
              // we should probably just return the decoded value if it starts with a specific structure or just try.

              // Limitation: We don't know the exact KEY Supabase is looking for here inside getAll() 
              // without checking Supabase internals, but usually it looks for `sb-<projectRef>-auth-token`.
              // Since we are applying this system-wide for this project, let's try to decode if it looks like our format.

              try {
                // Heuristic: If it decodes to JSON with specific structure
                const value0 = cookie.value;
                // If value is simple JSON, JSON.parse works.
                // If value is Base64 encoded JSON, we need to decode.

                // Try Base64 decode
                const decodedStr = Buffer.from(value0, "base64").toString("utf8");
                const decodedJson = JSON.parse(decodedStr);

                if (decodedJson.currentSession || decodedJson.expiresAt) {
                  // This is our custom format
                  return {
                    ...cookie,
                    value: JSON.stringify(decodedJson.currentSession ?? decodedJson)
                  };
                }
              } catch {
                // Not our custom base64 cookie
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
              // Logic:
              // Supabase gives us a JSON string of the session (value).
              // We need to wrap it into { currentSession: JSON.parse(value), expiresAt: ... } logic 
              // or just Base64 the value if we simplify.
              // To match storage-adapter.ts:

              try {
                const session = JSON.parse(value);
                const now = Math.round(Date.now() / 1000);
                const expiresAt = session.expires_at ?? (now + 60 * 60 * 24 * 7);

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
                };

                cookieStore.set(name, cookieValue, newOptions);
              } catch {
                // Fallback if not JSON (e.g. deletion or other simple values)
                cookieStore.set(name, value, {
                  ...options,
                  domain: ".dataviz.jp"
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
