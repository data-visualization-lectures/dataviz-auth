import { NextRequest, NextResponse } from "next/server";

const COOKIE_DOMAIN = ".dataviz.jp";

const projectRef = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    return url.hostname.split(".")[0];
  } catch {
    return "supabase";
  }
})();

const STORAGE_KEY = `sb-${projectRef}-auth-token`;

export async function POST(request: NextRequest) {
  try {
    let { session } = await request.json();

    // セッションが文字列（例: base64-...）で渡された場合はデコードする
    if (typeof session === "string") {
      try {
        const trimmed = session.replace(/^base64-/, "");
        const decoded = Buffer.from(trimmed, "base64").toString("utf8");
        session = JSON.parse(decoded)?.currentSession ?? JSON.parse(decoded);
      } catch (e) {
        console.error("Failed to decode session string", e);
        return NextResponse.json(
          { error: "Invalid session payload" },
          { status: 400 },
        );
      }
    }

    if (!session?.access_token) {
      return NextResponse.json(
        { error: "Invalid session payload" },
        { status: 400 },
      );
    }

    const now = Math.round(Date.now() / 1000);
    const expiresAt =
      session.expires_at ??
      (session.expires_in ? now + session.expires_in : now + 60 * 60 * 24 * 7);

    // Supabase auth-js の storage フォーマットを Base64 で安全にクッキー化
    const value = Buffer.from(
      JSON.stringify({
        currentSession: session,
        expiresAt,
      }),
      "utf8",
    ).toString("base64");
    const maxAge = session.expires_in ?? 60 * 60 * 24 * 7;

    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: STORAGE_KEY,
      value,
      domain: COOKIE_DOMAIN,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      maxAge,
    });

    return response;
  } catch (error) {
    console.error("Failed to set cookie", error);
    return NextResponse.json({ error: "Failed to set cookie" }, { status: 500 });
  }
}
