import { headers } from "next/headers";
import type { Locale } from "./i18n";

export { t, formatDateLocale } from "./i18n";
export type { Locale, TranslationKey } from "./i18n";

/** Accept-Language ヘッダーからロケールを判定（サーバーコンポーネント用） */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  const primary = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith("ja") ? "ja" : "en";
}
