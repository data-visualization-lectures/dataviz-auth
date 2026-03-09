"use client";

import { Button } from "@/components/ui/button";
import { createPortalSession } from "@/lib/apiClient";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function ManageSubscriptionButton({ isActive, locale }: { isActive: boolean; locale: Locale }) {
    async function handlePortal() {
        try {
            const data = await createPortalSession();
            if (data && data.url) {
                window.location.href = data.url;
            } else {
                toast.error(`${t(locale, "manage.errorResponse")}: ${JSON.stringify(data)}`);
            }
        } catch (e: any) {
            toast.error(`${t(locale, "manage.errorFailed")}: ${e.message ?? e}`);
        }
    }

    if (isActive) {
        return (
            <Button variant="outline" onClick={handlePortal}>
                {t(locale, "manage.change")}
            </Button>
        );
    }

    return (
        <Button variant="default" asChild>
            <a href="https://www.dataviz.jp/pricing/">{t(locale, "manage.viewPlans")}</a>
        </Button>
    );
}
