import { createAdminClient } from "@/lib/supabase/admin";

function htmlPage(title: string, message: string) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f6f7f8; color: #111827; }
      .wrap { max-width: 560px; margin: 48px auto; padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
      h1 { font-size: 22px; margin: 0 0 12px; }
      p { margin: 0; line-height: 1.7; }
      a { color: #2563eb; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>${title}</h1>
      <p>${message}</p>
      <p style="margin-top: 16px;"><a href="https://app.dataviz.jp/">app.dataviz.jp</a></p>
    </main>
  </body>
</html>`;
}

async function executeUnsubscribe(token: string) {
  const adminDb = createAdminClient();
  const { data: preference, error: fetchError } = await adminDb
    .from("marketing_email_preferences")
    .select("*")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (fetchError) {
    return {
      status: 500,
      title: "処理に失敗しました",
      message: "配信停止の処理中にエラーが発生しました。",
      code: "error" as const,
    };
  }
  if (!preference) {
    return {
      status: 404,
      title: "無効なリンクです",
      message: "この配信停止リンクは有効ではありません。",
      code: "invalid" as const,
    };
  }

  const { error: updateError } = await adminDb
    .from("marketing_email_preferences")
    .update({
      marketing_opt_in: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("user_id", preference.user_id);

  if (updateError) {
    return {
      status: 500,
      title: "処理に失敗しました",
      message: "配信停止の更新に失敗しました。",
      code: "error" as const,
    };
  }

  return {
    status: 200,
    title: "配信を停止しました",
    message: "今後、この種類のメールは配信されません。",
    code: "ok" as const,
  };
}

function getTokenFromRequest(request: Request): string {
  const url = new URL(request.url);
  return (url.searchParams.get("token") ?? "").trim();
}

export async function GET(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return new Response(
      htmlPage("無効なリンクです", "配信停止リンクのパラメータが不足しています。"),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const result = await executeUnsubscribe(token);
  return new Response(htmlPage(result.title, result.message), {
    status: result.status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return new Response("missing token", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const result = await executeUnsubscribe(token);
  return new Response(result.code, {
    status: result.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
