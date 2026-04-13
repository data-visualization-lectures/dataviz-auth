import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { DEFAULT_NEWSLETTER_LABEL } from "@/lib/marketing/template-defaults";

type MarketingEmailTemplateProps = {
  previewText: string;
  title: string;
  newsletterLabel: string;
  helperText: string;
  bodyHtml: string;
  unsubscribeUrl: string;
  locale: "ja" | "en";
};

const main = {
  backgroundColor: "#f3f4f6",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif",
  color: "#111827",
  margin: "0",
  padding: "24px 0",
};

const container = {
  margin: "0 auto",
  width: "100%",
  maxWidth: "640px",
};

const topBand = {
  height: "8px",
  backgroundColor: "#f48024",
  borderRadius: "10px 10px 0 0",
};

const hero = {
  backgroundColor: "#1f2937",
  padding: "18px 24px",
};

const heroTitle = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "700",
  margin: "0",
};

const heroMeta = {
  color: "#d1d5db",
  fontSize: "12px",
  margin: "6px 0 0",
};

const card = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderTop: "none",
  borderRadius: "0 0 10px 10px",
};

const section = {
  padding: "24px",
};

const titleStyle = {
  margin: "0 0 14px",
  fontSize: "28px",
  lineHeight: "1.25",
  fontWeight: "800",
};

const contentStyle = {
  fontSize: "15px",
  lineHeight: "1.8",
  color: "#111827",
};

const helperStyle = {
  backgroundColor: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: "8px",
  padding: "12px 14px",
  fontSize: "13px",
  lineHeight: "1.65",
  color: "#9a3412",
  margin: "0 0 18px",
};

const footerStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.7",
  margin: "0",
};

const unsubscribeLinkStyle = {
  color: "#2563eb",
  textDecoration: "underline",
};

export function MarketingEmailTemplate({
  previewText,
  title,
  newsletterLabel,
  helperText,
  bodyHtml,
  unsubscribeUrl,
  locale,
}: MarketingEmailTemplateProps) {
  const unsubscribeLabel =
    locale === "ja"
      ? "メール配信の停止はこちら"
      : "Click here to unsubscribe from these emails";
  const safeNewsletterLabel = newsletterLabel.trim() || DEFAULT_NEWSLETTER_LABEL[locale];
  const safeHelperText = helperText.trim();

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={topBand} />
          <Section style={hero}>
            <Text style={heroTitle}>{safeNewsletterLabel}</Text>
            <Text style={heroMeta}>dataviz.jp</Text>
          </Section>

          <Section style={card}>
            <Section style={section}>
              <Heading style={titleStyle}>{title}</Heading>
              {safeHelperText ? <Text style={helperStyle}>{safeHelperText}</Text> : null}
              <div
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
              <Hr style={{ margin: "20px 0", borderColor: "#e5e7eb" }} />
              <Text style={footerStyle}>
                <Link href={unsubscribeUrl} style={unsubscribeLinkStyle}>
                  {unsubscribeLabel}
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
