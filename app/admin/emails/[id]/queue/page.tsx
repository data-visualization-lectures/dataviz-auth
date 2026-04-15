import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import { getCampaignById, listCampaignRuns } from "@/lib/marketing/repository";
import { AdminEmailQueueRunner } from "@/components/admin-email-queue-runner";
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

export default async function CampaignQueuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminForPage();
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();
  const isQueueEnabled = campaign.campaign_type === "marketing";
  const runs = isQueueEnabled ? await listCampaignRuns(campaign.id, 30) : [];
  const latestRun = runs[0] ?? null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 md:gap-8 max-w-4xl mx-auto w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">キュー管理</h2>
            <p className="text-muted-foreground">{campaign.title}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/admin/emails/${campaign.id}`}>詳細へ戻る</Link>
          </Button>
        </div>

        {isQueueEnabled ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>現在の状態</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">ステータス</div>
                  <div>{latestRun?.status ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">対象件数</div>
                  <div>{latestRun?.total_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">送信成功</div>
                  <div>{latestRun?.sent_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">送信失敗</div>
                  <div>{latestRun?.failed_count ?? 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">テスト送信日時</div>
                  <div>{formatDate(campaign.test_sent_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Run作成日時</div>
                  <div>{formatDate(latestRun?.queued_at ?? null)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">実行開始日時</div>
                  <div>{formatDate(latestRun?.started_at ?? null)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">完了日時</div>
                  <div>{formatDate(latestRun?.completed_at ?? null)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">過去送信済み含む</div>
                  <div>
                    {latestRun
                      ? latestRun.include_previously_sent
                        ? "はい"
                        : "いいえ"
                      : "-"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <AdminEmailQueueRunner
              campaignId={campaign.id}
              runOptions={runs.map((run) => ({
                id: run.id,
                status: run.status,
                createdAt: run.created_at,
              }))}
              initialRunId={latestRun?.id}
            />
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>キュー管理は利用できません</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              このメール種別は自動送信対象のため、キュー操作は無効です。
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
