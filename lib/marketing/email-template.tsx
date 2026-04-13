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

type MarketingEmailTemplateProps = {
  previewText: string;
  title: string;
  bodyHtml: string;
  unsubscribeUrl: string;
  locale: "ja" | "en";
};

const main = {
  backgroundColor: "#f6f7f8",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: "#111827",
  margin: "0 auto",
};

const container = {
  margin: "24px auto",
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  width: "100%",
  maxWidth: "640px",
};

const section = {
  padding: "24px",
};

const titleStyle = {
  margin: "0 0 16px",
  fontSize: "22px",
  lineHeight: "1.4",
};

const contentStyle = {
  fontSize: "15px",
  lineHeight: "1.7",
};

const footerStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.6",
};

export function MarketingEmailTemplate({
  previewText,
  title,
  bodyHtml,
  unsubscribeUrl,
  locale,
}: MarketingEmailTemplateProps) {
  const unsubscribeLabel =
    locale === "ja"
      ? "メール配信の停止はこちら"
      : "Click here to unsubscribe from these emails";

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Heading style={titleStyle}>{title}</Heading>
            <div
              style={contentStyle}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
            <Hr />
            <Text style={footerStyle}>
              <Link href={unsubscribeUrl}>{unsubscribeLabel}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
