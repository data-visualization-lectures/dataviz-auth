"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queueCampaign, runCampaignQueue } from "@/app/admin/emails/actions";

type Props = {
  campaignId: string;
};

export function AdminEmailQueueRunner({ campaignId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [batchSize, setBatchSize] = useState("20");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleQueue = () => {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await queueCampaign(campaignId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice(`キューを作成しました。対象件数: ${result.totalCount}`);
      router.refresh();
    });
  };

  const handleRun = () => {
    setNotice("");
    setError("");
    const parsed = Number.parseInt(batchSize, 10);
    startTransition(async () => {
      const result = await runCampaignQueue(campaignId, parsed);
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
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleQueue} disabled={isPending}>
            キュー作成
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">バッチ件数</span>
            <Input
              value={batchSize}
              onChange={(event) => setBatchSize(event.target.value)}
              className="w-20"
            />
          </div>
          <Button onClick={handleRun} disabled={isPending}>
            実行開始
          </Button>
        </div>
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
