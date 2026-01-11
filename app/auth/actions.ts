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
    console.log("[DEBUG] inviteCode:", inviteCode);
    console.log("[DEBUG] data.user:", data.user?.id);

    if (inviteCode && data.user) {
        const validCode = process.env.NEXT_PUBLIC_TRIAL_INVITE_CODE;
        console.log("[DEBUG] validCode from env:", validCode);
        console.log("[DEBUG] Codes match:", inviteCode === validCode);

        if (inviteCode === validCode && validCode) {
            console.log("[DEBUG] Starting trial subscription creation for user:", data.user.id);
            try {
                // Admin Clientを使用（RLSをバイパス）
                const { createAdminClient } = await import("@/lib/supabase/admin");
                const adminClient = createAdminClient();
                console.log("[DEBUG] Admin client created successfully");

                // トライアル期間: 30日
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 30);

                const { error: insertError } = await adminClient.from("subscriptions").insert({
                    user_id: data.user.id,
                    status: "trialing",
                    current_period_end: trialEndDate.toISOString(),
                    plan_id: "pro_monthly",
                });

                if (insertError) {
                    console.error("[ERROR] Failed to create trial subscription:", insertError);
                } else {
                    console.log("[SUCCESS] Trial subscription created for user:", data.user.id);
                }
            } catch (err) {
                console.error("[ERROR] Exception in trial subscription creation:", err);
                // エラーが発生してもサインアップは成功とする
            }
        } else {
            console.log("[DEBUG] Invite code validation failed");
        }
    } else {
        console.log("[DEBUG] Skipping trial creation - inviteCode or user missing");
    }

    return { success: true };
}
