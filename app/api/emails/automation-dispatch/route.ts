import { NextResponse } from "next/server";
import { dispatchChurnAutomationEmails } from "@/lib/marketing/automation";

export const dynamic = "force-dynamic";

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron");

  if (!cronSecret) {
    return vercelCronHeader === "1" || process.env.NODE_ENV === "development";
  }

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice("bearer ".length);
    return token === cronSecret;
  }

  return vercelCronHeader === "1";
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await dispatchChurnAutomationEmails();
    return NextResponse.json({
      ok: true,
      ...result,
      now: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    console.error("automation-dispatch failed", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
