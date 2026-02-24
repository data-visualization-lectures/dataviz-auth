import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthedActions } from "./authed-actions";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <AuthedActions email={user.email ?? "Account"} />
  ) : (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/login"
        className="inline-flex h-7 items-center rounded border border-[#eee] bg-[#eee] px-[10px] text-xs font-semibold text-[#111] transition-colors hover:bg-white hover:text-black"
      >
        Log in
      </Link>
      <Link
        href="/auth/sign-up"
        className="inline-flex h-7 items-center rounded border border-[#444] px-[10px] text-xs text-[#eee] transition-colors hover:border-[#666] hover:bg-[#333] hover:text-white"
      >
        Sign up
      </Link>
    </div>
  );
}
