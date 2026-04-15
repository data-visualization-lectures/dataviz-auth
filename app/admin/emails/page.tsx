import Link from "next/link";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import { listCampaigns, listLatestCampaignRunsByCampaignIds } from "@/lib/marketing/repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminEmailDuplicateButton } from "@/components/admin-email-duplicate-button";
import type { CampaignRecord, CampaignType } from "@/lib/marketing/types";

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

const GROUPS: { type: CampaignType; heading: string; emptyText: string }[] = [
  {
    type: "account_created",
    heading: "アカウント作成時",
    emptyText: "アカウント作成時のメールはありません。",
  },
  {
    type: "trial_expired_unconverted",
    heading: "無料期間終了（未課金）",
    emptyText: "無料期間終了（未課金）メールはありません。",
  },
  {
    type: "paid_canceled_nonrenewal",
    heading: "有料終了（継続なし）",
    emptyText: "有料終了（継続なし）メールはありません。",
  },
  {
    type: "marketing",
    heading: "マーケティング",
    emptyText: "マーケティングメールはありません。",
  },
];

function groupByType(campaigns: CampaignRecord[]): Record<CampaignType, CampaignRecord[]> {
  const grouped: Record<CampaignType, CampaignRecord[]> = {
    account_created: [],
    trial_expired_unconverted: [],
    paid_canceled_nonrenewal: [],
    marketing: [],
  };

  for (const campaign of campaigns) {
    grouped[campaign.campaign_type].push(campaign);
  }

  return grouped;
}

export default async function AdminEmailsPage() {
  await requireAdminForPage();
  const campaigns = await listCampaigns(200);
  const latestRunMap = await listLatestCampaignRunsByCampaignIds(campaigns.map((c) => c.id));
  const groupedCampaigns = groupByType(campaigns);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 md:gap-8 max-w-6xl mx-auto w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">メール配信管理</h2>
            <p className="text-muted-foreground">メール作成・キュー実行・送信履歴</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin">管理者ダッシュボードへ戻る</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/emails/new">新規作成</Link>
            </Button>
          </div>
        </div>

        {GROUPS.map((group) => {
          const rows = groupedCampaigns[group.type];
          return (
            <Card key={group.type}>
              <CardHeader>
                <CardTitle>{group.heading}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-2 text-left">タイトル</th>
                        <th className="py-2 px-2 text-left">ステータス</th>
                        <th className="py-2 px-2 text-left">自動送信</th>
                        <th className="py-2 px-2 text-right">対象</th>
                        <th className="py-2 px-2 text-right">送信成功</th>
                        <th className="py-2 px-2 text-right">送信失敗</th>
                        <th className="py-2 px-2 text-left">作成日時</th>
                        <th className="py-2 px-2 text-left">更新日時</th>
                        <th className="py-2 px-2 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-muted-foreground">
                            {group.emptyText}
                          </td>
                        </tr>
                      ) : (
                        rows.map((campaign) => {
                          const latestRun = latestRunMap[campaign.id];
                          const latestStatus = latestRun?.status ?? "-";
                          const latestTotal = latestRun?.total_count ?? 0;
                          const latestSent = latestRun?.sent_count ?? 0;
                          const latestFailed = latestRun?.failed_count ?? 0;

                          return (
                            <tr key={campaign.id} className="border-b last:border-0">
                              <td className="py-2 px-2">{campaign.title}</td>
                              <td className="py-2 px-2">{latestStatus}</td>
                              <td className="py-2 px-2">
                                {campaign.campaign_type !== "marketing"
                                  ? campaign.auto_send_enabled
                                    ? "有効"
                                    : "無効"
                                  : "-"}
                              </td>
                              <td className="py-2 px-2 text-right">{latestTotal}</td>
                              <td className="py-2 px-2 text-right">{latestSent}</td>
                              <td className="py-2 px-2 text-right">{latestFailed}</td>
                              <td className="py-2 px-2 whitespace-nowrap">
                                {formatDate(campaign.created_at)}
                              </td>
                              <td className="py-2 px-2 whitespace-nowrap">
                                {formatDate(campaign.updated_at)}
                              </td>
                              <td className="py-2 px-2 whitespace-nowrap">
                                <div className="flex flex-wrap gap-2">
                                  <Link className="underline" href={`/admin/emails/${campaign.id}`}>
                                    詳細
                                  </Link>
                                  <Link className="underline" href={`/admin/emails/${campaign.id}/edit`}>
                                    編集
                                  </Link>
                                  {campaign.campaign_type === "marketing" ? (
                                    <Link className="underline" href={`/admin/emails/${campaign.id}/queue`}>
                                      キュー
                                    </Link>
                                  ) : null}
                                  {campaign.campaign_type === "marketing" ? (
                                    <AdminEmailDuplicateButton campaignId={campaign.id} />
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
