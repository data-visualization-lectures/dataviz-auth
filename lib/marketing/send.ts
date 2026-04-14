import { render } from "@react-email/render";
import { Resend } from "resend";
import { MarketingEmailTemplate } from "@/lib/marketing/email-template";
import { markdownToHtml, markdownToText } from "@/lib/marketing/markdown";
import type { LocaleCode } from "@/lib/marketing/types";

type BuildEmailParams = {
  title: string;
  newsletterLabel: string;
  helperText: string;
  subject: string;
  bodyMarkdown: string;
  unsubscribeUrl: string;
  locale: LocaleCode;
};

type SendEmailParams = BuildEmailParams & {
  to: string;
};

type ParsedFromAddress = {
  name: string | null;
  address: string;
};

function parseFromAddress(value: string): ParsedFromAddress | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const bracketMatch = trimmed.match(/^(.*)<\s*([^>]+)\s*>$/);
  if (bracketMatch) {
    const rawName = bracketMatch[1]?.trim() ?? "";
    const address = bracketMatch[2]?.trim() ?? "";
    if (!address.includes("@")) return null;
    return {
      name: rawName ? rawName.replace(/^"|"$/g, "") : null,
      address,
    };
  }

  if (!trimmed.includes("@")) return null;
  return { name: null, address: trimmed };
}

function resolveSenderName(locale: LocaleCode, fallbackName?: string | null): string {
  const localized =
    locale === "ja"
      ? (process.env.EMAIL_FROM_NAME_JA ?? "").trim()
      : (process.env.EMAIL_FROM_NAME_EN ?? "").trim();
  if (localized) return localized;

  const common = (process.env.EMAIL_FROM_NAME ?? "").trim();
  if (common) return common;

  if (fallbackName?.trim()) return fallbackName.trim();
  return locale === "ja" ? "データの道具箱" : "Data Toolbox";
}

export function getEmailFromAddress(locale: LocaleCode): string {
  const configuredFrom = (process.env.EMAIL_FROM_ADDRESS ?? "").trim();
  const fallback = parseFromAddress("news@dataviz.jp");
  const parsed = parseFromAddress(configuredFrom) ?? fallback;
  if (!parsed) {
    return locale === "ja"
      ? "データの道具箱 <news@dataviz.jp>"
      : "Data Toolbox <news@dataviz.jp>";
  }

  const name = resolveSenderName(locale, parsed.name);
  return `${name} <${parsed.address}>`;
}

function ensureResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

export async function buildMarketingEmail({
  title,
  newsletterLabel,
  helperText,
  subject,
  bodyMarkdown,
  unsubscribeUrl,
  locale,
}: BuildEmailParams) {
  const bodyHtml = markdownToHtml(bodyMarkdown);
  const previewText = markdownToText(bodyMarkdown).slice(0, 140) || subject;

  const html = await render(
    MarketingEmailTemplate({
      previewText,
      title,
      newsletterLabel,
      helperText,
      bodyHtml,
      unsubscribeUrl,
      locale,
    })
  );
  const text = `${subject}\n\n${markdownToText(bodyMarkdown)}\n\n${unsubscribeUrl}`;

  return { html, text };
}

export async function sendMarketingEmail({
  to,
  title,
  newsletterLabel,
  helperText,
  subject,
  bodyMarkdown,
  unsubscribeUrl,
  locale,
}: SendEmailParams) {
  const resend = ensureResendClient();
  const { html, text } = await buildMarketingEmail({
    title,
    newsletterLabel,
    helperText,
    subject,
    bodyMarkdown,
    unsubscribeUrl,
    locale,
  });

  const result = await resend.emails.send({
    from: getEmailFromAddress(locale),
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if ((result as { error?: { message?: string } }).error) {
    const message = (result as { error?: { message?: string } }).error?.message;
    throw new Error(message || "Failed to send email");
  }

  const id = (result as { data?: { id?: string } }).data?.id ?? null;
  return { messageId: id };
}
