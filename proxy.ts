import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

// Next.js 16 proxy entry point (replaces middleware.ts)
export async function proxy(request: NextRequest) {
  // 一時的にミドルウェアを無効化し、ログイン安定を優先
  return request;
}

export const config = {
  matcher: [],
};
