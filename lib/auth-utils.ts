import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validates an invite code and applies a trial subscription to a user.
 * This should be called after a successful signup or first-time OAuth login.
 */
export async function applyTrialSubscription(userId: string, inviteCode: string | null) {
    if (!inviteCode || !userId) {
        console.log("[DEBUG] Skipping trial creation - inviteCode or user missing");
        return { success: false, reason: "Missing code or user ID" };
    }

    const validCode = process.env.NEXT_PUBLIC_TRIAL_INVITE_CODE;

    if (inviteCode !== validCode || !validCode) {
        console.log("[DEBUG] Invite code validation failed");
        return { success: false, reason: "Invalid invite code" };
    }

    console.log("[DEBUG] Starting trial subscription creation for user:", userId);
    try {
        const adminClient = createAdminClient();

        // trial period: 30 days
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);

        const { error: insertError } = await adminClient.from("subscriptions").insert({
            user_id: userId,
            status: "trialing",
            current_period_end: trialEndDate.toISOString(),
            plan_id: "pro_monthly",
        });

        if (insertError) {
            console.error("[ERROR] Failed to create trial subscription:", insertError);
            return { success: false, error: insertError };
        }

        console.log("[SUCCESS] Trial subscription created for user:", userId);
        return { success: true };
    } catch (err) {
        console.error("[ERROR] Exception in trial subscription creation:", err);
        return { success: false, error: err };
    }
}
