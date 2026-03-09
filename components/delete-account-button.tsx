"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/lib/apiClient";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function DeleteAccountButton({ locale }: { locale: Locale }) {
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        const confirmed = window.confirm(t(locale, "deleteAccount.confirm"));
        if (!confirmed) return;

        setLoading(true);
        try {
            await deleteAccount();
            const supabase = createClient();
            await supabase.auth.signOut();
            const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://www.dataviz.jp";
            window.location.href = mainSiteUrl + "/";
        } catch (e: any) {
            toast.error(`${t(locale, "deleteAccount.error")}: ${e.message ?? e}`);
            setLoading(false);
        }
    }

    return (
        <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
        >
            {loading ? t(locale, "deleteAccount.deleting") : t(locale, "deleteAccount.button")}
        </Button>
    );
}
