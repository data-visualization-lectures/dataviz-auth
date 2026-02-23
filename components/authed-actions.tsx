"use client";

import { LogoutButton } from "./logout-button";

type AuthedActionsProps = {
  email: string;
};

export function AuthedActions({ email }: AuthedActionsProps) {
  return (
    <div className="flex items-center gap-4">
      <a
        href="https://auth.dataviz.jp/account"
        className="hover:underline"
      >
        アカウント情報
      </a>
      <a href="https://auth.dataviz.jp/account" className="hover:underline">
        {email}
      </a>
      <div>
        <LogoutButton />
      </div>
    </div>
  );
}
