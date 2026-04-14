import Link from "next/link";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import { AdminEmailEditor } from "@/components/admin-email-editor";
import { Button } from "@/components/ui/button";
import { DEFAULT_HELPER_TEXT, DEFAULT_NEWSLETTER_LABEL } from "@/lib/marketing/template-defaults";

export const dynamic = "force-dynamic";

export default async function NewEmailCampaignPage() {
  await requireAdminForPage();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 md:gap-8 max-w-5xl mx-auto w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">新規配信メール</h2>
            <p className="text-muted-foreground">
              日本語・英語の件名/本文を入力し、下書きを作成します。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/emails">一覧へ戻る</Link>
          </Button>
        </div>

        <AdminEmailEditor
          initial={{
            title: "",
            emailTitleJa: "",
            emailTitleEn: "",
            campaignType: "marketing",
            segmentKeys: [],
            newsletterLabelJa: DEFAULT_NEWSLETTER_LABEL.ja,
            newsletterLabelEn: DEFAULT_NEWSLETTER_LABEL.en,
            helperTextJa: DEFAULT_HELPER_TEXT.ja,
            helperTextEn: DEFAULT_HELPER_TEXT.en,
            subjectJa: "",
            subjectEn: "",
            bodyMdJa: "",
            bodyMdEn: "",
          }}
        />
      </main>
    </div>
  );
}
