"use client";

import { Button } from "@/components/ui/button";
import { createCheckoutSession, createPortalSession } from "@/lib/apiClient";
import { toast } from "sonner";

export function ManageSubscriptionButton({ isActive }: { isActive: boolean }) {
    async function handleAction() {
        try {
            const { url } = isActive
                ? await createPortalSession()
                : await createCheckoutSession();

            if (url) {
                window.location.href = url;
            } else {
                toast.error("リダイレクトURLが取得できませんでした。時間をおいて再試行してください。");
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
