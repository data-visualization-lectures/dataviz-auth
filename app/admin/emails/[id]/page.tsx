import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import { getCampaignById, listCampaignRuns } from "@/lib/marketing/repository";
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

function formatCampaignType(type: string): string {
  if (type === "account_created") return "アカウント作成時";
  if (type === "account_canceled") return "解約時";
  return "マーケティング";
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
  const runs = await listCampaignRuns(campaign.id, 20);
  const latestRun = runs[0] ?? null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 md:gap-8 max-w-5xl mx-auto w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{campaign.title}</h2>
            <p className="text-muted-foreground">メール詳細</p>
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
            {campaign.campaign_type !== "account_created" ? (
              <Button asChild variant="outline">
                <Link href={`/admin/emails/${campaign.id}/queue`}>キュー管理</Link>
              </Button>
            ) : null}
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
            <CardContent className="text-2xl font-bold">{latestRun?.status ?? "-"}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">対象件数</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{latestRun?.total_count ?? 0}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">送信成功 / 失敗</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {latestRun?.sent_count ?? 0} / {latestRun?.failed_count ?? 0}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>配信設定</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">種別</div>
              <div>{formatCampaignType(campaign.campaign_type)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">セグメント</div>
              <div>{campaign.segment_keys.join(", ") || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">自動送信</div>
              <div>
                {campaign.campaign_type === "account_created"
                  ? campaign.auto_send_enabled
                    ? "有効"
                    : "無効"
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">テスト送信日時</div>
              <div>{formatDate(campaign.test_sent_at)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">キュー作成日時</div>
              <div>{formatDate(latestRun?.queued_at ?? null)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">配信開始日時</div>
              <div>{formatDate(latestRun?.started_at ?? null)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">配信完了日時</div>
              <div>{formatDate(latestRun?.completed_at ?? null)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">最終エラー</div>
              <div className="break-all">{latestRun?.last_error || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">過去送信済み含む</div>
              <div>
                {latestRun ? (latestRun.include_previously_sent ? "はい" : "いいえ") : "-"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-2 text-left">作成日時</th>
                    <th className="py-2 px-2 text-left">ステータス</th>
                    <th className="py-2 px-2 text-right">対象</th>
                    <th className="py-2 px-2 text-right">成功</th>
                    <th className="py-2 px-2 text-right">失敗</th>
                    <th className="py-2 px-2 text-right">スキップ</th>
                    <th className="py-2 px-2 text-left">設定</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Run履歴はありません。
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id} className="border-b last:border-0">
                        <td className="py-2 px-2 whitespace-nowrap">{formatDate(run.created_at)}</td>
                        <td className="py-2 px-2">{run.status}</td>
                        <td className="py-2 px-2 text-right">{run.total_count}</td>
                        <td className="py-2 px-2 text-right">{run.sent_count}</td>
                        <td className="py-2 px-2 text-right">{run.failed_count}</td>
                        <td className="py-2 px-2 text-right">{run.skipped_count}</td>
                        <td className="py-2 px-2">
                          {run.include_previously_sent ? "過去送信含む" : "未送信のみ"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
