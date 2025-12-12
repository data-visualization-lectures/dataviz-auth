"use client";

import { useRouter } from "next/navigation";
import { LogoutButton } from "./logout-button";
import { MouseEvent, KeyboardEvent } from "react";

type AuthedActionsProps = {
  email: string;
};

export function AuthedActions({ email }: AuthedActionsProps) {
  const router = useRouter();

  const handleNavigate = () => {
    router.push("/account");
  };

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNavigate();
    }
  };

  return (
    <div
      className="flex items-center gap-4 cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
    >
      <span>{email}</span>
      <div onClick={stopPropagation} onKeyDown={(event) => event.stopPropagation()}>
        <LogoutButton />
      </div>
    </div>
  );
}
