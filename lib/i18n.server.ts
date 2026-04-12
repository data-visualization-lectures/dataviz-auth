import { cookies, headers } from "next/headers";
import type { Locale } from "./i18n";

export { t, formatDateLocale } from "./i18n";
export type { Locale, TranslationKey } from "./i18n";

/** locale cookie 優先、fallback で Accept-Language ヘッダーから判定（サーバーコンポーネント用） */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  if (cookieLocale === "ja" || cookieLocale === "en") return cookieLocale;

  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  const primary = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith("ja") ? "ja" : "en";
}
