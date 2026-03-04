"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/lib/apiClient";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function DeleteAccountButton() {
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        const confirmed = window.confirm(
            "この操作は取り消せません。アカウントに紐づくすべてのデータが削除されます。本当に削除しますか？"
        );
        if (!confirmed) return;

        setLoading(true);
        try {
            await deleteAccount();
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/auth/login";
        } catch (e: any) {
            toast.error(`アカウント削除に失敗しました: ${e.message ?? e}`);
            setLoading(false);
        }
    }

    return (
        <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
        >
            {loading ? "削除中..." : "アカウントを削除"}
        </Button>
    );
}
