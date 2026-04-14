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

export function getEmailFromAddress(): string {
  const configuredFrom = (process.env.EMAIL_FROM_ADDRESS ?? "").trim();
  const configuredName = (process.env.EMAIL_FROM_NAME ?? "").trim();

  if (!configuredFrom) {
    return "Data Toolbox <news@dataviz.jp>";
  }

  if (configuredFrom.includes("<") && configuredFrom.includes(">")) {
    return configuredFrom;
  }

  const name = configuredName || "Data Toolbox";
  return `${name} <${configuredFrom}>`;
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
    from: getEmailFromAddress(),
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
