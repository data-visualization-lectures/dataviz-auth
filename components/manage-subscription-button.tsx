"use client";

import { Button } from "@/components/ui/button";
import { createCheckoutSession, createPortalSession } from "@/lib/apiClient";
import { toast } from "sonner";

export function ManageSubscriptionButton({ isActive }: { isActive: boolean }) {
    async function handleAction() {
        try {
            const data = isActive
                ? await createPortalSession()
                : await createCheckoutSession();

            if (data && data.url) {
                window.location.href = data.url;
            } else {
                toast.error(`レスポンス異常: ${JSON.stringify(data)}`);
            }
        } catch (e: any) {
            toast.error(`操作に失敗しました: ${e.message ?? e}`);
        }
    }

    return (
        <Button variant="outline" onClick={handleAction}>
            {isActive ? "契約内容の変更" : "有料プランに登録"}
        </Button>
    );
}
