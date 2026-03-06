"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordButton({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (err) {
      if (err.message.includes("rate limit")) {
        setError("メール送信の上限に達しました。しばらく時間をおいて再度お試しください。");
      } else {
        setError("送信に失敗しました");
      }
    } else {
      setSent(true);
    }
    setSending(false);
  };

  if (sent) {
    return (
      <p className="text-sm text-green-600">
        パスワード変更メールを送信しました。メールをご確認ください。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground w-fit"
      >
        {sending ? "送信中..." : "パスワードを変更する"}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
