import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 proxy entry point (replaces middleware.ts)
export async function proxy(request: NextRequest) {
  // ミドルウェアを一時停止してログインの安定性を優先
  return NextResponse.next({
    request,
  });
}

export const config = {
  // ミドルウェア無効化（テスト目的）
  matcher: [],
};
