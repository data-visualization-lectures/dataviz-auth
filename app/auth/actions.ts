"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

    return redirect(redirectTo ?? "/account");
}

export async function signUp(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const inviteCode = formData.get("inviteCode") as string | null;
    const redirectTo = formData.get("redirectTo") as string | null;

    const supabase = await createClient();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://auth.dataviz.jp";
    const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.dataviz.jp";
    const nextPath = redirectTo || `${mainSiteUrl}/pricing/`;
    const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    // ユーザー作成
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo,
        },
    });

    if (error) {
        return { error: error.message };
    }

    // identities が空 = 既に同じメールアドレスのユーザーが存在する
    if (data.user && data.user.identities?.length === 0) {
        return { error: "このメールアドレスは既に登録されています" };
    }

    // 全新規ユーザーにトライアルサブスクリプションを作成
    if (data.user) {
        const { applyTrialSubscription } = await import("@/lib/auth-utils");
        await applyTrialSubscription(data.user.id);
    }

    return { success: true };
}
