"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // ログ収集サービスがあればここでエラーを送信する
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">エラーが発生しました</h2>
                <p className="text-muted-foreground">
                    申し訳ありませんが、予期せぬエラーが発生しました。
                </p>
            </div>
            <Button onClick={() => reset()} variant="default">
                再試行する
            </Button>
        </div>
    );
}
