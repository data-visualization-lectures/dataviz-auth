import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

// Next.js 16 proxy entry point (replaces middleware.ts)
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
