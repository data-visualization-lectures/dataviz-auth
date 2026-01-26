import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // The `/auth/callback` route is required for the server-side auth flow
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/";

    const inviteCode = searchParams.get("invite_code");

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.user) {
            // Apply trial subscription if invite code is present
            if (inviteCode) {
                const { applyTrialSubscription } = await import("@/lib/auth-utils");
                await applyTrialSubscription(data.user.id, inviteCode);
            }

            // Check if next is an absolute URL
            if (next.startsWith('http')) {
                return NextResponse.redirect(next);
            }

            const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === "development";
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
        const cookieHeader = request.headers.get("cookie") || "";
        const hasCodeVerifier = cookieHeader.includes(`${process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME ?? "sb-dataviz-auth-token"}-code-verifier`);
        console.error("Auth Loop Error:", {
            error,
            hasCodeVerifier,
            codePresent: Boolean(code),
            inviteCodePresent: Boolean(inviteCode),
        });
    } else {
        console.error('No code found in search params');
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
