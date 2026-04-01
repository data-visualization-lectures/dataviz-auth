"use client";

import { LogoutButton } from "./logout-button";
import type { Locale } from "@/lib/i18n";

type AuthedActionsProps = {
  email: string;
  locale: Locale;
};

export function AuthedActions({ email, locale }: AuthedActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <a
        href="https://app.dataviz.jp/account"
        className="hidden sm:inline whitespace-nowrap text-[#aaa] no-underline hover:text-white hover:underline"
      >
        {email}
      </a>
      <div>
        <LogoutButton locale={locale} />
      </div>
    </div>
  );
}
