import { MeResponse, SubscriptionStatus } from "@/types/user";

export function formatSubscriptionStatus(sub: MeResponse['subscription']) {
    if (!sub) return "未加入";

    if (sub.cancel_at_period_end && sub.current_period_end) {
        const date = new Date(sub.current_period_end);
        const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        return `解約予約中（${dateStr} まで利用可能）`;
    }

    const statusMap: Record<SubscriptionStatus, string> = {
        none: "未加入",
        active: "加入中",
        past_due: "支払い遅延中",
        canceled: "解約済み",
        incomplete: "チェックアウト完了待ち",
        trialing: "トライアル中",
    };

    return statusMap[sub.status] ?? sub.status;
}
