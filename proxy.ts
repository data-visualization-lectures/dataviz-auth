import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

// Next.js 16 proxy entry point (replaces middleware.ts)
export async function proxy(request: NextRequest) {
  // セッション更新のみを有効化（リダイレクト等は lib/supabase/proxy.ts で無効化済み）
  return updateSession(request);
}

export const config = {
  // 静的アセットのみ除外し、auth含めてセッション更新を行う（ドメイン付きクッキー発行を確実にするため）
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
