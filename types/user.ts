export type SubscriptionStatus = "none" | "active" | "past_due" | "canceled" | "incomplete" | "trialing";

export type MeResponse = {
    user: {
        id: string;
        email: string;
    };
    profile: {
        display_name?: string | null;
    } | null;
    subscription: {
        status: SubscriptionStatus;
        cancel_at_period_end?: boolean;
        current_period_end?: string;
    } | null;
};
