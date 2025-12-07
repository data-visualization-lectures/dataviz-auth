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
    const { session } = await request.json();

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

    const payload = {
      currentSession: session,
      expiresAt,
    };

    const encodedValue = encodeURIComponent(JSON.stringify(payload));
    const maxAge = session.expires_in ?? 60 * 60 * 24 * 7;

    const response = NextResponse.json({ ok: true });

    // ドメイン共有用
    response.cookies.set({
      name: STORAGE_KEY,
      value: encodedValue,
      domain: COOKIE_DOMAIN,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      maxAge,
    });

    // ホストスコープ（念のため。ブラウザがドメイン付きのみを拒否するケースに対応）
    response.cookies.set({
      name: STORAGE_KEY,
      value: encodedValue,
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
