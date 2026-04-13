import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import { getCampaignById } from "@/lib/marketing/repository";
import { AdminEmailEditor } from "@/components/admin-email-editor";
import { Button } from "@/components/ui/button";
import { DEFAULT_HELPER_TEXT, DEFAULT_NEWSLETTER_LABEL } from "@/lib/marketing/template-defaults";

export const dynamic = "force-dynamic";

export default async function EditEmailCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminForPage();
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 md:gap-8 max-w-5xl mx-auto w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">キャンペーン編集</h2>
            <p className="text-muted-foreground">{campaign.title}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/emails">一覧へ戻る</Link>
          </Button>
        </div>

        <AdminEmailEditor
          campaignId={campaign.id}
          initial={{
            id: campaign.id,
            title: campaign.title,
            segmentKeys: campaign.segment_keys ?? [],
            newsletterLabelJa: campaign.newsletter_label_ja || DEFAULT_NEWSLETTER_LABEL.ja,
            newsletterLabelEn: campaign.newsletter_label_en || DEFAULT_NEWSLETTER_LABEL.en,
            helperTextJa: campaign.helper_text_ja || DEFAULT_HELPER_TEXT.ja,
            helperTextEn: campaign.helper_text_en || DEFAULT_HELPER_TEXT.en,
            subjectJa: campaign.subject_ja,
            subjectEn: campaign.subject_en,
            bodyMdJa: campaign.body_md_ja,
            bodyMdEn: campaign.body_md_en,
          }}
        />
      </main>
    </div>
  );
}
