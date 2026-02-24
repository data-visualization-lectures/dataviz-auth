"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-7 items-center rounded border border-[#444] px-[10px] text-xs text-[#eee] transition-colors hover:border-[#666] hover:bg-[#333] hover:text-white"
    >
      Log out
    </button>
  );
}
