import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

// Next.js 16 proxy entry point (replaces middleware.ts)
export async function proxy(request: NextRequest) {
  // セッション更新のみを有効化（リダイレクト等は lib/supabase/proxy.ts で無効化済み）
  return updateSession(request);
}

export const config = {
  // auth系と静的アセットは除外し、それ以外でセッション更新だけを行う
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
