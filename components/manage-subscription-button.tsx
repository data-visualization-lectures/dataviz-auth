"use client";

import { Button } from "@/components/ui/button";
import { createPortalSession } from "@/lib/apiClient";
import { toast } from "sonner";

export function ManageSubscriptionButton({ isActive }: { isActive: boolean }) {
    async function handlePortal() {
        try {
            const data = await createPortalSession();
            if (data && data.url) {
                window.location.href = data.url;
            } else {
                toast.error(`レスポンス異常: ${JSON.stringify(data)}`);
            }
        } catch (e: any) {
            toast.error(`操作に失敗しました: ${e.message ?? e}`);
        }
    }

    if (isActive) {
        return (
            <Button variant="outline" onClick={handlePortal}>
                契約内容の変更
            </Button>
        );
    }

    return (
        <Button variant="default" asChild>
            <a href="https://www.dataviz.jp/pricing/">料金プランを見る</a>
        </Button>
    );
}
