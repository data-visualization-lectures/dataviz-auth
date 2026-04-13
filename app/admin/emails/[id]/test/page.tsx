import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import { getCampaignById } from "@/lib/marketing/repository";
import { AdminEmailTestSender } from "@/components/admin-email-test-sender";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CampaignTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdminForPage();
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 md:gap-8 max-w-4xl mx-auto w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">テスト送信</h2>
            <p className="text-muted-foreground">{campaign.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/emails/${campaign.id}`}>詳細へ戻る</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/emails/${campaign.id}/queue`}>キュー管理へ</Link>
            </Button>
          </div>
        </div>

        <AdminEmailTestSender campaignId={campaign.id} defaultEmail={admin.email} />
      </main>
    </div>
  );
}
