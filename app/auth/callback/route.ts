import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // The `/auth/callback` route is required for the server-side auth flow
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/";

    const signupLocale = searchParams.get("signup_locale");

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.user) {
            // academia メールは academia サブスクリプション、それ以外は 14日 trial を付与
            const userEmail = data.user.email ?? "";
            const { isAcademiaEmail } = await import("@/lib/academia");
            if (userEmail && (await isAcademiaEmail(userEmail))) {
                const { applyAcademiaSubscription } = await import("@/lib/auth-utils");
                await applyAcademiaSubscription(data.user.id);
            } else {
                const { applyTrialSubscription } = await import("@/lib/auth-utils");
                await applyTrialSubscription(data.user.id);
            }

            // OAuth新規ユーザーにsignup_localeを保存（既存ユーザーは上書きしない）
            if (signupLocale && !data.user.user_metadata?.signup_locale) {
                await supabase.auth.updateUser({
                    data: { signup_locale: signupLocale },
                });
            }

            const createdAt = data.user.created_at ? new Date(data.user.created_at) : null;
            const createdWithin30Minutes =
                !!createdAt && Date.now() - createdAt.getTime() <= 30 * 60 * 1000;
            const shouldTryAccountCreatedMail = !!signupLocale || createdWithin30Minutes;

            if (shouldTryAccountCreatedMail && data.user.email) {
                try {
                    const { sendAccountCreatedEmailIfNeeded } = await import("@/lib/marketing/automation");
                    await sendAccountCreatedEmailIfNeeded({
                        userId: data.user.id,
                        email: data.user.email,
                        signupLocale:
                            signupLocale === "en"
                                ? "en"
                                : data.user.user_metadata?.signup_locale === "en"
                                    ? "en"
                                    : "ja",
                    });
                } catch (mailError) {
                    console.error("account_created auto send failed", mailError);
                }
            }

            // グループ招待の受諾処理（招待メールからの登録時）
            if (data.user.email) {
                try {
                    const { createAdminClient } = await import("@/lib/supabase/admin");
                    const adminDb = createAdminClient();
                    const { data: pendingInvites } = await adminDb
                        .from("group_invitations")
                        .select("id, group_id, role")
                        .eq("email", data.user.email)
                        .eq("status", "pending");

                    if (pendingInvites && pendingInvites.length > 0) {
                        for (const invite of pendingInvites) {
                            const { error: rpcError } = await adminDb
                                .rpc("accept_group_invitation", {
                                    p_group_id: invite.group_id,
                                    p_user_id: data.user.id,
                                    p_role: invite.role,
                                    p_invitation_id: invite.id,
                                });
                            if (rpcError) {
                                console.error("accept_group_invitation failed", rpcError);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Group invitation acceptance failed", err);
                }
            }

            // Check if next is an absolute URL
            if (next.startsWith('http')) {
                return NextResponse.redirect(next);
            }

            // OAuth コールバックは id.dataviz.jp 上で受けるが、マイページ系は app.dataviz.jp でしか
            // 配信していないため、本番では常に app.dataviz.jp へ飛ばす。
            const isLocalEnv = process.env.NODE_ENV === "development";
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            }
            return NextResponse.redirect(`https://app.dataviz.jp${next}`);
        }
        console.error("Auth Loop Error:", error);
    } else {
        console.error('No code found in search params');
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
