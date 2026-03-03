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
    console.log("[DEBUG] signUp action called");
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const inviteCode = formData.get("inviteCode") as string | null;
    const redirectTo = formData.get("redirectTo") as string | null;

    console.log("[DEBUG] Form data parsed", { hasEmail: !!email, hasPassword: !!password, inviteCode, redirectTo });

    const supabase = await createClient();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://auth.dataviz.jp";
    const emailRedirectTo = redirectTo
        ? `${siteUrl}${redirectTo}`
        : `${siteUrl}/account`;

    // ユーザー作成
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo,
        },
    });

    if (error) {
        console.error("[ERROR] Supabase signUp failed:", error.message);
        return { error: error.message };
    }

    // 招待コードが有効な場合、トライアルサブスクリプションを作成
    if (inviteCode && data.user) {
        const { applyTrialSubscription } = await import("@/lib/auth-utils");
        await applyTrialSubscription(data.user.id, inviteCode);
    } else {
        console.log("[DEBUG] Skipping trial creation - inviteCode or user missing");
    }

    return { success: true };
}
