import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import { getCampaignById } from "@/lib/marketing/repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default async function CampaignDetailPage({
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{campaign.title}</h2>
            <p className="text-muted-foreground">キャンペーン詳細</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/emails">一覧へ戻る</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/emails/${campaign.id}/edit`}>編集</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/emails/${campaign.id}/preview`}>プレビュー</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/emails/${campaign.id}/test`}>テスト送信</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/emails/${campaign.id}/queue`}>キュー管理</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/emails/${campaign.id}/recipients`}>宛先結果</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ステータス</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{campaign.status}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">対象件数</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{campaign.total_count}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">送信成功 / 失敗</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {campaign.sent_count} / {campaign.failed_count}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>配信設定</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">セグメント</div>
              <div>{campaign.segment_keys.join(", ") || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">テスト送信日時</div>
              <div>{formatDate(campaign.test_sent_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">キュー作成日時</div>
              <div>{formatDate(campaign.queued_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">配信開始日時</div>
              <div>{formatDate(campaign.started_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">配信完了日時</div>
              <div>{formatDate(campaign.completed_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">最終エラー</div>
              <div className="break-all">{campaign.last_error || "-"}</div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
