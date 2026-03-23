import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validates an invite code and applies a trial subscription to a user.
 * Automatically applies a 14-day trial to all new users after signup or first-time OAuth login.
 */
export async function applyTrialSubscription(userId: string) {
    if (!userId) {
        console.log("[DEBUG] Skipping trial creation - user missing");
        return { success: false, reason: "Missing user ID" };
    }

    console.log("[DEBUG] Starting trial subscription creation for user:", userId);
    try {
        const adminClient = createAdminClient();

        // trial period: 14 days
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const { error: insertError } = await adminClient.from("subscriptions").insert({
            user_id: userId,
            status: "trialing",
            current_period_end: trialEndDate.toISOString(),
            plan_id: "trial",
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

/**
 * Applies a trial subscription to an existing user (already registered).
 * Handles both users with no subscription record and users with expired/canceled subscriptions.
 */
export async function applyTrialToExistingUser(userId: string, inviteCode: string) {
    const validCode = process.env.NEXT_PUBLIC_TRIAL_INVITE_CODE;

    if (inviteCode !== validCode || !validCode) {
        return { success: false, reason: "invalid_code" } as const;
    }

    try {
        const adminClient = createAdminClient();

        // Check current subscription status
        const { data: existing, error: fetchError } = await adminClient
            .from("subscriptions")
            .select("status")
            .eq("user_id", userId)
            .maybeSingle();

        if (fetchError) {
            console.error("[ERROR] Failed to fetch subscription:", fetchError);
            return { success: false, reason: "fetch_error" } as const;
        }

        // Already has active subscription
        if (existing && (existing.status === "active" || existing.status === "trialing")) {
            return { success: false, reason: "already_active" } as const;
        }

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const trialData = {
            status: "trialing" as const,
            plan_id: "trial",
            current_period_end: trialEndDate.toISOString(),
        };

        if (existing) {
            // Update existing canceled/expired record
            const { error: updateError } = await adminClient
                .from("subscriptions")
                .update(trialData)
                .eq("user_id", userId);

            if (updateError) {
                console.error("[ERROR] Failed to update subscription:", updateError);
                return { success: false, reason: "update_error" } as const;
            }
        } else {
            // Insert new record
            const { error: insertError } = await adminClient
                .from("subscriptions")
                .insert({ user_id: userId, ...trialData });

            if (insertError) {
                console.error("[ERROR] Failed to insert subscription:", insertError);
                return { success: false, reason: "insert_error" } as const;
            }
        }

        console.log("[SUCCESS] Trial applied to existing user:", userId);
        return { success: true } as const;
    } catch (err) {
        console.error("[ERROR] Exception in applyTrialToExistingUser:", err);
        return { success: false, reason: "unexpected_error" } as const;
    }
}
