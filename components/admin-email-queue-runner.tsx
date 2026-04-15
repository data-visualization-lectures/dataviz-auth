"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCampaignRun, runCampaignRun } from "@/app/admin/emails/actions";

type Props = {
  campaignId: string;
  runOptions: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
  initialRunId?: string;
};

function formatDate(value: string): string {
  const d = new Date(value);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function AdminEmailQueueRunner({ campaignId, runOptions, initialRunId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [batchSize, setBatchSize] = useState("20");
  const [includePreviouslySent, setIncludePreviouslySent] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(initialRunId ?? "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleQueue = () => {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await createCampaignRun(campaignId, {
        includePreviouslySent,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSelectedRunId(result.runId);
      setNotice(
        `Runを作成しました。対象件数: ${result.totalCount} / 除外件数: ${result.excludedCount}`
      );
      router.refresh();
    });
  };

  const handleRun = () => {
    setNotice("");
    setError("");
    const parsed = Number.parseInt(batchSize, 10);
    if (!selectedRunId) {
      setError("先にRunを選択してください");
      return;
    }
    startTransition(async () => {
      const result = await runCampaignRun(selectedRunId, parsed);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice(
        `実行完了: processed=${result.processed}, sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}, remaining=${result.remaining}`
      );
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>キュー実行</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Run選択</span>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={selectedRunId}
              onChange={(event) => setSelectedRunId(event.target.value)}
            >
              <option value="">Runを選択</option>
              {runOptions.map((run) => (
                <option key={run.id} value={run.id}>
                  {`${formatDate(run.createdAt)} / ${run.status} / ${run.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleQueue} disabled={isPending}>
            Run作成
          </Button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground border rounded px-3 py-2">
            <input
              type="checkbox"
              checked={includePreviouslySent}
              onChange={(event) => setIncludePreviouslySent(event.target.checked)}
            />
            <span>過去送信済みユーザーを含める</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRun} disabled={isPending || !selectedRunId}>
            実行開始
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">バッチ件数</span>
            <Input
              value={batchSize}
              onChange={(event) => setBatchSize(event.target.value)}
              className="w-20"
            />
          </div>
        </div>
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
