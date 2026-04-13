import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import { getCampaignById } from "@/lib/marketing/repository";
import { buildMarketingEmail } from "@/lib/marketing/send";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CampaignPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  await requireAdminForPage();
  const { id } = await params;
  const { locale } = await searchParams;
  const selectedLocale = locale === "en" ? "en" : "ja";

  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const subject = selectedLocale === "en" ? campaign.subject_en : campaign.subject_ja;
  const body = selectedLocale === "en" ? campaign.body_md_en : campaign.body_md_ja;
  const unsubscribeUrl = `https://app.dataviz.jp/api/emails/unsubscribe?token=preview-token`;
  const { html, text } = await buildMarketingEmail({
    title: campaign.title,
    subject,
    bodyMarkdown: body,
    unsubscribeUrl,
    locale: selectedLocale,
  });

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 md:gap-8 max-w-5xl mx-auto w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">メールプレビュー</h2>
            <p className="text-muted-foreground">{campaign.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant={selectedLocale === "ja" ? "default" : "outline"}>
              <Link href={`/admin/emails/${campaign.id}/preview?locale=ja`}>日本語</Link>
            </Button>
            <Button asChild variant={selectedLocale === "en" ? "default" : "outline"}>
              <Link href={`/admin/emails/${campaign.id}/preview?locale=en`}>English</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/emails/${campaign.id}/edit`}>編集へ戻る</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>HTMLプレビュー</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              title="email-preview"
              srcDoc={html}
              className="w-full h-[720px] border rounded"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Text版</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded border">{text}</pre>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
