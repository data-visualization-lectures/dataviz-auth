import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 proxy entry point (replaces middleware.ts)
export async function proxy(request: NextRequest) {
  // ログイン安定を優先し、ミドルウェア処理は一時停止
  return NextResponse.next({ request });
}

export const config = {
  matcher: [],
};
