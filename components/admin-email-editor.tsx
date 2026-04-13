"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importHugoContent, resolveUrlCard, saveCampaign } from "@/app/admin/emails/actions";
import type { CampaignInput, SegmentKey } from "@/lib/marketing/types";

const SEGMENT_LABELS: { key: SegmentKey; label: string }[] = [
  { key: "free_trialing", label: "無料 / お試し期間中" },
  { key: "free_trial_ended", label: "無料 / お試し期間終了" },
  { key: "paid_individual", label: "有料 / 個人で利用" },
  { key: "paid_team", label: "有料 / 複数人で利用" },
  { key: "free_academia", label: "無料 / アカデミア" },
];

type EditorProps = {
  campaignId?: string;
  initial: CampaignInput;
};

export function AdminEmailEditor({ campaignId, initial }: EditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [title, setTitle] = useState(initial.title);
  const [segmentKeys, setSegmentKeys] = useState<SegmentKey[]>(initial.segmentKeys);
  const [subjectJa, setSubjectJa] = useState(initial.subjectJa);
  const [subjectEn, setSubjectEn] = useState(initial.subjectEn);
  const [bodyMdJa, setBodyMdJa] = useState(initial.bodyMdJa);
  const [bodyMdEn, setBodyMdEn] = useState(initial.bodyMdEn);

  const [hugoUrl, setHugoUrl] = useState("");
  const [hugoLocale, setHugoLocale] = useState<"ja" | "en">("ja");
  const [cardUrl, setCardUrl] = useState("");
  const [cardLocale, setCardLocale] = useState<"ja" | "en">("ja");

  const canSave = useMemo(() => {
    return (
      title.trim().length > 0 &&
      subjectJa.trim().length > 0 &&
      subjectEn.trim().length > 0 &&
      bodyMdJa.trim().length > 0 &&
      bodyMdEn.trim().length > 0 &&
      segmentKeys.length > 0
    );
  }, [title, subjectJa, subjectEn, bodyMdJa, bodyMdEn, segmentKeys]);

  const setLocaleBody = (locale: "ja" | "en", value: string) => {
    if (locale === "ja") {
      setBodyMdJa((prev) => [prev, value].filter(Boolean).join("\n\n"));
    } else {
      setBodyMdEn((prev) => [prev, value].filter(Boolean).join("\n\n"));
    }
  };

  const toggleSegment = (key: SegmentKey) => {
    setSegmentKeys((prev) => {
      if (prev.includes(key)) return prev.filter((value) => value !== key);
      return [...prev, key];
    });
  };

  const handleSave = () => {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await saveCampaign({
        id: campaignId,
        title,
        segmentKeys,
        subjectJa,
        subjectEn,
        bodyMdJa,
        bodyMdEn,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      const targetId = result.campaignId;
      setNotice("下書きを保存しました。");
      router.push(`/admin/emails/${targetId}/edit`);
      router.refresh();
    });
  };

  const handleImportHugo = () => {
    if (!hugoUrl.trim()) return;
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await importHugoContent(hugoUrl.trim());
      if (!result.success) {
        setError(result.error);
        return;
      }

      setLocaleBody(hugoLocale, result.markdown);
      if (!title.trim()) {
        setTitle(result.title);
      }
      setNotice("Hugo記事を取り込みました。");
    });
  };

  const handleInsertCard = () => {
    if (!cardUrl.trim()) return;
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await resolveUrlCard(cardUrl.trim());
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLocaleBody(cardLocale, result.markdown);
      setNotice("URLカードを本文に挿入しました。");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">キャンペーンタイトル</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例: 4月のおすすめツール特集"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">配信セグメント</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SEGMENT_LABELS.map((segment) => (
                <label
                  key={segment.key}
                  className="flex items-center gap-2 text-sm border rounded px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={segmentKeys.includes(segment.key)}
                    onChange={() => toggleSegment(segment.key)}
                  />
                  <span>{segment.label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>本文取り込み</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="Hugo記事URLを入力（例: https://app.dataviz.jp/showcase/...）"
              value={hugoUrl}
              onChange={(event) => setHugoUrl(event.target.value)}
            />
            <select
              className="border rounded px-3 py-2 text-sm"
              value={hugoLocale}
              onChange={(event) => setHugoLocale(event.target.value as "ja" | "en")}
            >
              <option value="ja">日本語本文に挿入</option>
              <option value="en">英語本文に挿入</option>
            </select>
            <Button onClick={handleImportHugo} disabled={isPending}>
              Hugo取り込み
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="一般WebページURLを入力（URLカード）"
              value={cardUrl}
              onChange={(event) => setCardUrl(event.target.value)}
            />
            <select
              className="border rounded px-3 py-2 text-sm"
              value={cardLocale}
              onChange={(event) => setCardLocale(event.target.value as "ja" | "en")}
            >
              <option value="ja">日本語本文に挿入</option>
              <option value="en">英語本文に挿入</option>
            </select>
            <Button onClick={handleInsertCard} disabled={isPending}>
              URLカード挿入
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>日本語版</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            value={subjectJa}
            onChange={(event) => setSubjectJa(event.target.value)}
            placeholder="日本語件名"
          />
          <textarea
            value={bodyMdJa}
            onChange={(event) => setBodyMdJa(event.target.value)}
            className="min-h-[280px] rounded-md border p-3 text-sm"
            placeholder="Markdown本文（日本語）"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>英語版</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            value={subjectEn}
            onChange={(event) => setSubjectEn(event.target.value)}
            placeholder="English subject"
          />
          <textarea
            value={bodyMdEn}
            onChange={(event) => setBodyMdEn(event.target.value)}
            className="min-h-[280px] rounded-md border p-3 text-sm"
            placeholder="Markdown body (English)"
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={!canSave || isPending}>
          下書きを保存
        </Button>
        {campaignId && (
          <>
            <Button variant="outline" onClick={() => router.push(`/admin/emails/${campaignId}`)}>
              配信詳細
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/emails/${campaignId}/preview`)}>
              プレビュー
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/emails/${campaignId}/test`)}>
              テスト送信
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/emails/${campaignId}/queue`)}>
              キュー管理
            </Button>
          </>
        )}
      </div>

      {notice && <p className="text-sm text-emerald-700">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
