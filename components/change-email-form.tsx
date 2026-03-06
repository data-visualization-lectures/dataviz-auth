"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newEmail || newEmail === currentEmail) {
      setError("現在と異なるメールアドレスを入力してください");
      return;
    }
    setSending(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ email: newEmail });

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
      setEditing(false);
    }
    setSending(false);
  };

  const handleCancel = () => {
    setNewEmail("");
    setEditing(false);
    setError(null);
  };

  if (sent) {
    return (
      <p className="text-sm text-green-600">
        {newEmail} に確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。
      </p>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground w-fit"
      >
        メールアドレスを変更する
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="新しいメールアドレス"
          className="h-8 w-64 text-sm"
          disabled={sending}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSubmit} disabled={sending}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel} disabled={sending}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
