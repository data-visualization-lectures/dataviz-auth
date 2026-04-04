export type SubscriptionStatus = "none" | "active" | "past_due" | "canceled" | "incomplete" | "trialing";

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  planName: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  subscriptionCreatedAt: string | null;
};

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
