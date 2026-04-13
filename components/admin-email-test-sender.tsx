"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendCampaignTest } from "@/app/admin/emails/actions";

type Props = {
  campaignId: string;
  defaultEmail?: string;
};

export function AdminEmailTestSender({ campaignId, defaultEmail = "" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toEmail, setToEmail] = useState(defaultEmail);
  const [locale, setLocale] = useState<"ja" | "en">("ja");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleSend = () => {
    setNotice("");
    setError("");
    startTransition(async () => {
      const result = await sendCampaignTest(campaignId, toEmail, locale);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNotice(`テスト送信に成功しました（message id: ${result.messageId ?? "n/a"}）。`);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>テスト送信</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input
          type="email"
          value={toEmail}
          onChange={(event) => setToEmail(event.target.value)}
          placeholder="test@example.com"
        />
        <select
          className="border rounded px-3 py-2 text-sm"
          value={locale}
          onChange={(event) => setLocale(event.target.value as "ja" | "en")}
        >
          <option value="ja">日本語テンプレート</option>
          <option value="en">英語テンプレート</option>
        </select>
        <Button onClick={handleSend} disabled={isPending || !toEmail.trim()}>
          テスト送信を実行
        </Button>
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
