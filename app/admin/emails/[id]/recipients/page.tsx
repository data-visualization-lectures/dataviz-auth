import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminForPage } from "@/lib/marketing/admin-auth";
import {
  getCampaignById,
  getCampaignRunRecipients,
  listCampaignRuns,
} from "@/lib/marketing/repository";
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

export default async function CampaignRecipientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ runId?: string | string[] }>;
}) {
  await requireAdminForPage();
  const { id } = await params;
  const { runId } = await searchParams;
  const runIdValue = Array.isArray(runId) ? runId[0] : runId;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();
  const runs = await listCampaignRuns(campaign.id, 50);
  const selectedRun =
    (runIdValue ? runs.find((run) => run.id === runIdValue) : null) ?? runs[0] ?? null;
  const recipients = selectedRun ? await getCampaignRunRecipients(selectedRun.id, 1000) : [];

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 md:p-10 gap-8">
      <main className="grid flex-1 items-start gap-4 md:gap-8 max-w-6xl mx-auto w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">宛先結果一覧</h2>
            <p className="text-muted-foreground">{campaign.title}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/admin/emails/${campaign.id}`}>詳細へ戻る</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Run選択</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm">
            <form method="get" className="flex flex-wrap items-center gap-2">
              <select
                name="runId"
                defaultValue={selectedRun?.id ?? ""}
                className="border rounded px-3 py-2 text-sm min-w-[320px]"
              >
                {runs.length === 0 ? <option value="">Runなし</option> : null}
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {`${formatDate(run.created_at)} / ${run.status} / ${run.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                表示
              </Button>
            </form>
            {selectedRun ? (
              <div className="text-muted-foreground">
                includePreviouslySent:{" "}
                {selectedRun.include_previously_sent ? "true" : "false"}
              </div>
            ) : (
              <div className="text-muted-foreground">表示可能なRunがありません</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              送信ログ（最大1000件表示）
              {selectedRun ? ` / Run ${selectedRun.id.slice(0, 8)}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-2 text-left">メール</th>
                    <th className="py-2 px-2 text-left">言語</th>
                    <th className="py-2 px-2 text-left">セグメント</th>
                    <th className="py-2 px-2 text-left">ステータス</th>
                    <th className="py-2 px-2 text-right">試行回数</th>
                    <th className="py-2 px-2 text-left">送信日時</th>
                    <th className="py-2 px-2 text-left">エラー</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedRun || recipients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        宛先データがありません。先にRun作成を実行してください。
                      </td>
                    </tr>
                  ) : (
                    recipients.map((recipient) => (
                      <tr key={recipient.id} className="border-b last:border-0">
                        <td className="py-2 px-2">{recipient.email}</td>
                        <td className="py-2 px-2">{recipient.locale}</td>
                        <td className="py-2 px-2">{recipient.segment_key}</td>
                        <td className="py-2 px-2">{recipient.status}</td>
                        <td className="py-2 px-2 text-right">{recipient.attempt_count}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          {formatDate(recipient.sent_at)}
                        </td>
                        <td className="py-2 px-2 break-all">{recipient.last_error || "-"}</td>
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
