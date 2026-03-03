"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelAndRefund } from "@/lib/apiClient";
import { toast } from "sonner";

export function CancelAndRefundButton() {
    const [loading, setLoading] = useState(false);

    async function handleRefund() {
        const confirmed = window.confirm(
            "解約して全額返金します。この操作は取り消せません。本当に実行しますか？"
        );
        if (!confirmed) return;

        setLoading(true);
        try {
            await cancelAndRefund();
            toast.success("解約・返金が完了しました");
            window.location.reload();
        } catch (e: any) {
            const message = e.message?.includes("403")
                ? "返金期間（14日）を過ぎているか、既に返金済みです"
                : `返金処理に失敗しました: ${e.message ?? e}`;
            toast.error(message);
            setLoading(false);
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleRefund}
            disabled={loading}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
            {loading ? "処理中..." : "14日以内なら解約して返金する"}
        </Button>
    );
}
