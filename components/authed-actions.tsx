"use client";

import { LogoutButton } from "./logout-button";

type AuthedActionsProps = {
  email: string;
};

export function AuthedActions({ email }: AuthedActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <a
        href="https://auth.dataviz.jp/account"
        className="hidden sm:inline text-[#aaa] hover:text-white hover:underline"
      >
        {email}
      </a>
      <div>
        <LogoutButton />
      </div>
    </div>
  );
}
