import type { LocaleCode } from "@/lib/marketing/types";

export const DEFAULT_NEWSLETTER_LABEL: Record<LocaleCode, string> = {
  ja: "データの道具箱 ニュースレター",
  en: "Data Toolbox Newsletter",
};

export const DEFAULT_HELPER_TEXT: Record<LocaleCode, string> = {
  ja: "このメールは管理画面で作成されたお知らせを配信しています。",
  en: "This email contains an update created from the admin console.",
};
