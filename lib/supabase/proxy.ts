import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  const cookieOptions = {
    domain: ".dataviz.jp",
    sameSite: "lax" as const,
    secure: true,
  };

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          try {
            const allCookies = request.cookies.getAll();
            // Map them to handle decoding if necessary (Replicate logic from server.ts)
            return allCookies.map((cookie) => {
              try {
                const value0 = cookie.value;
                const decodedStr = Buffer.from(value0, "base64").toString("utf8");
                const decodedJson = JSON.parse(decodedStr);

                if (decodedJson.currentSession || decodedJson.expiresAt) {
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
          } catch {
            return request.cookies.getAll();
          }
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            // Encode value to Base64 before setting (Replicate logic from server.ts)
            try {
              const session = JSON.parse(value);
              const now = Math.round(Date.now() / 1000);
              const expiresAt = session.expires_at ?? (now + 60 * 60 * 24 * 7);

              const cookieValue = Buffer.from(JSON.stringify({
                currentSession: session,
                expiresAt
              })).toString("base64");

              const newOptions = {
                ...options,
                domain: ".dataviz.jp",
                sameSite: "lax" as const,
                secure: true,
              };

              supabaseResponse.cookies.set(name, cookieValue, newOptions);
            } catch {
              supabaseResponse.cookies.set(name, value, {
                ...options,
                domain: ".dataviz.jp"
              });
            }
          });
        },
      },
      cookieOptions,
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  let user = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims ?? null;
  } catch (error) {
    console.error("getClaims error", error);
  }

  // Note: 一律リダイレクトを外し、まずはログイン処理とクッキー定着を優先

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
