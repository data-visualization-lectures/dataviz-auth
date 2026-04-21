import { headers } from "next/headers";

const ID_HOST = "id.dataviz.jp";
const APP_HOST = "app.dataviz.jp";

/**
 * マイページ系パスへリダイレクトする際の URL を返す。
 * 現在のリクエストが id.dataviz.jp の場合は絶対 URL で app.dataviz.jp に飛ばす。
 * それ以外（app.dataviz.jp / localhost / Vercel Preview 等）は相対パスのまま返す。
 */
export async function mypageUrl(path: string): Promise<string> {
    const hdrs = await headers();
    const host = hdrs.get("host") || "";
    if (host === ID_HOST) {
        return `https://${APP_HOST}${path}`;
    }
    return path;
}
