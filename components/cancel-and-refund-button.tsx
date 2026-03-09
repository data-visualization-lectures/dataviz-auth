"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelAndRefund } from "@/lib/apiClient";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function CancelAndRefundButton({ locale }: { locale: Locale }) {
    const [loading, setLoading] = useState(false);

    async function handleRefund() {
        const confirmed = window.confirm(t(locale, "refund.confirm"));
        if (!confirmed) return;

        setLoading(true);
        try {
            await cancelAndRefund();
            toast.success(t(locale, "refund.success"));
            window.location.reload();
        } catch (e: any) {
            const message = e.message?.includes("403")
                ? t(locale, "refund.expired")
                : `${t(locale, "refund.error")}: ${e.message ?? e}`;
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
            {loading ? t(locale, "refund.processing") : t(locale, "refund.button")}
        </Button>
    );
}
