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

    const supabase = await createClient();

    // ユーザー作成
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://auth.dataviz.jp"}/account`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    // 招待コードが有効な場合、トライアルサブスクリプションを作成
    if (inviteCode && data.user) {
        const validCode = process.env.NEXT_PUBLIC_TRIAL_INVITE_CODE;

        if (inviteCode === validCode && validCode) {
            try {
                // トライアル期間: 30日
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 30);

                await supabase.from("subscriptions").insert({
                    user_id: data.user.id,
                    status: "trialing",
                    current_period_end: trialEndDate.toISOString(),
                    plan_id: "pro_monthly",
                });
            } catch (err) {
                console.error("Failed to create trial subscription:", err);
                // エラーが発生してもサインアップは成功とする
            }
        }
    }

    return { success: true };
}
