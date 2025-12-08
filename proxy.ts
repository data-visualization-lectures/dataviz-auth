import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 proxy entry point (replaces middleware.ts)
export async function proxy(request: NextRequest) {
  // 一時停止してログイン安定を優先
  return NextResponse.next({ request });
}

export const config = {
  matcher: [],
};
