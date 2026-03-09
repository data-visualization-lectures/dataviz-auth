"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function ChangePasswordButton({ email, locale }: { email: string; locale: Locale }) {
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
        setError(t(locale, "password.rateLimited"));
      } else {
        setError(t(locale, "password.sendError"));
      }
    } else {
      setSent(true);
    }
    setSending(false);
  };

  if (sent) {
    return (
      <p className="text-sm text-green-600">
        {t(locale, "password.sent")}
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
        {sending ? t(locale, "password.sending") : t(locale, "password.button")}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
