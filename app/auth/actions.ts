"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { mypageUrl } from "@/lib/mypage-url";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const redirectTo = formData.get("redirectTo") as string | null;

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    return redirect(redirectTo ?? (await mypageUrl("/account")));
}

export async function signUp(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const redirectTo = formData.get("redirectTo") as string | null;
    const locale = (formData.get("locale") as string) || "en";

    const supabase = await createClient();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.dataviz.jp";
    const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.dataviz.jp";
    const pricingPath = locale === "en" ? "/en/pricing/" : "/pricing/";
    const nextPath = redirectTo || `${mainSiteUrl}${pricingPath}`;
    const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}&signup_locale=${encodeURIComponent(locale)}`;

    // ユーザー作成
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo,
            data: {
                signup_locale: locale,
            },
        },
    });

    if (error) {
        return { error: error.message };
    }

    // identities が空 = 既に同じメールアドレスのユーザーが存在する
    if (data.user && data.user.identities?.length === 0) {
        return { error: "このメールアドレスは既に登録されています" };
    }

    // academia メールは academia サブスクリプション、それ以外は 14日 trial を付与
    if (data.user) {
        const userEmail = data.user.email ?? "";
        const { isAcademiaEmail } = await import("@/lib/academia");
        if (userEmail && (await isAcademiaEmail(userEmail))) {
            const { applyAcademiaSubscription } = await import("@/lib/auth-utils");
            await applyAcademiaSubscription(data.user.id);
        } else {
            const { applyTrialSubscription } = await import("@/lib/auth-utils");
            await applyTrialSubscription(data.user.id);
        }
    }

    return { success: true };
}
