"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteCampaign,
  importHugoContent,
  resolveUrlCard,
  saveCampaign,
} from "@/app/admin/emails/actions";
import type { CampaignInput, CampaignType, SegmentKey } from "@/lib/marketing/types";

const SEGMENT_LABELS: { key: SegmentKey; label: string }[] = [
  { key: "free_trialing", label: "無料 / お試し期間中" },
  { key: "free_trial_ended", label: "無料 / お試し期間終了" },
  { key: "paid_individual", label: "有料 / 個人で利用" },
  { key: "paid_team", label: "有料 / 複数人で利用" },
  { key: "free_academia", label: "無料 / アカデミア" },
];

const CAMPAIGN_TYPE_LABELS: { key: CampaignType; label: string }[] = [
  { key: "account_created", label: "アカウント作成時" },
  { key: "trial_expired_unconverted", label: "無料期間終了（未課金）" },
  { key: "paid_canceled_nonrenewal", label: "有料終了（継続なし）" },
  { key: "marketing", label: "マーケティング" },
];

type EditorProps = {
  campaignId?: string;
  initial: CampaignInput;
  canEnableAutoSend?: boolean;
};

export function AdminEmailEditor({
  campaignId,
  initial,
  canEnableAutoSend = false,
}: EditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [title, setTitle] = useState(initial.title);
  const [emailTitleJa, setEmailTitleJa] = useState(initial.emailTitleJa);
  const [emailTitleEn, setEmailTitleEn] = useState(initial.emailTitleEn);
  const [autoSendEnabled, setAutoSendEnabled] = useState(initial.autoSendEnabled);
  const [campaignType, setCampaignType] = useState<CampaignType>(initial.campaignType);
  const [segmentKeys, setSegmentKeys] = useState<SegmentKey[]>(initial.segmentKeys);
  const [newsletterLabelJa, setNewsletterLabelJa] = useState(initial.newsletterLabelJa);
  const [newsletterLabelEn, setNewsletterLabelEn] = useState(initial.newsletterLabelEn);
  const [helperTextJa, setHelperTextJa] = useState(initial.helperTextJa);
  const [helperTextEn, setHelperTextEn] = useState(initial.helperTextEn);
  const [subjectJa, setSubjectJa] = useState(initial.subjectJa);
  const [subjectEn, setSubjectEn] = useState(initial.subjectEn);
  const [bodyMdJa, setBodyMdJa] = useState(initial.bodyMdJa);
  const [bodyMdEn, setBodyMdEn] = useState(initial.bodyMdEn);

  const [hugoUrl, setHugoUrl] = useState("");
  const [hugoLocale, setHugoLocale] = useState<"ja" | "en">("ja");
  const [cardUrl, setCardUrl] = useState("");
  const [cardLocale, setCardLocale] = useState<"ja" | "en">("ja");
  const isMarketingCampaign = campaignType === "marketing";
  const isAutomationCampaign = campaignType !== "marketing";
  const isQueueAvailableCampaign = campaignType === "marketing";

  const canSave = useMemo(() => {
    return (
      title.trim().length > 0 &&
      emailTitleJa.trim().length > 0 &&
      emailTitleEn.trim().length > 0 &&
      newsletterLabelJa.trim().length > 0 &&
      newsletterLabelEn.trim().length > 0 &&
      subjectJa.trim().length > 0 &&
      subjectEn.trim().length > 0 &&
      bodyMdJa.trim().length > 0 &&
      bodyMdEn.trim().length > 0 &&
      (!isMarketingCampaign || segmentKeys.length > 0)
    );
  }, [
    title,
    emailTitleJa,
    emailTitleEn,
    newsletterLabelJa,
    newsletterLabelEn,
    subjectJa,
    subjectEn,
    bodyMdJa,
    bodyMdEn,
    segmentKeys,
    isMarketingCampaign,
  ]);

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
        emailTitleJa,
        emailTitleEn,
        autoSendEnabled,
        campaignType,
        segmentKeys: isMarketingCampaign ? segmentKeys : [],
        newsletterLabelJa,
        newsletterLabelEn,
        helperTextJa,
        helperTextEn,
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
      if (hugoLocale === "ja" && !emailTitleJa.trim()) {
        setEmailTitleJa(result.title);
      }
      if (hugoLocale === "en" && !emailTitleEn.trim()) {
        setEmailTitleEn(result.title);
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

  const handleDeleteCampaign = () => {
    if (!campaignId) return;

    const confirmed = window.confirm("このメールを削除しますか？\nこの操作は取り消せません。");
    if (!confirmed) return;

    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await deleteCampaign(campaignId);
      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/admin/emails");
      router.refresh();
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
            <label className="text-sm font-medium">管理用タイトル</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例: 4月のおすすめツール特集"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">メールタイトル（日本語）</label>
              <Input
                value={emailTitleJa}
                onChange={(event) => setEmailTitleJa(event.target.value)}
                placeholder="例: データの道具箱へようこそ！"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">メールタイトル（英語）</label>
              <Input
                value={emailTitleEn}
                onChange={(event) => setEmailTitleEn(event.target.value)}
                placeholder="Example: Welcome to Data Toolbox!"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">メール種別</label>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={campaignType}
              onChange={(event) => {
                const nextType = event.target.value as CampaignType;
                setCampaignType(nextType);
                if (nextType !== "marketing") {
                  setSegmentKeys([]);
                }
                if (nextType === "marketing") {
                  setAutoSendEnabled(false);
                }
              }}
            >
              {CAMPAIGN_TYPE_LABELS.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">配信セグメント</label>
            {isMarketingCampaign ? (
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
            ) : (
              <p className="text-sm text-muted-foreground border rounded px-3 py-2">
                この種別では配信セグメントは使用しません。
              </p>
            )}
          </div>

          {isAutomationCampaign ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">自動送信設定</label>
              <label className="flex items-center gap-2 text-sm border rounded px-3 py-2">
                <input
                  type="checkbox"
                  checked={autoSendEnabled}
                  disabled={isPending || (!canEnableAutoSend && !autoSendEnabled)}
                  onChange={(event) => setAutoSendEnabled(event.target.checked)}
                />
                <span>この種別のイベント発生時にこのメールを自動送信する</span>
              </label>
              {!canEnableAutoSend && !autoSendEnabled ? (
                <p className="text-xs text-muted-foreground">
                  有効化するには先にテスト送信を実行してください。
                </p>
              ) : null}
            </div>
          ) : null}
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
          <CardTitle>テンプレート文言</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">ヘッダー（日本語）</label>
            <Input
              value={newsletterLabelJa}
              onChange={(event) => setNewsletterLabelJa(event.target.value)}
              placeholder="例: データの道具箱 ニュースレター"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">ヘッダー（英語）</label>
            <Input
              value={newsletterLabelEn}
              onChange={(event) => setNewsletterLabelEn(event.target.value)}
              placeholder="Example: Data Toolbox Newsletter"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">補助ボックス（日本語）</label>
            <textarea
              value={helperTextJa}
              onChange={(event) => setHelperTextJa(event.target.value)}
              className="min-h-[84px] rounded-md border p-3 text-sm"
              placeholder="例: このメールは管理画面で作成されたお知らせです。"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">補助ボックス（英語）</label>
            <textarea
              value={helperTextEn}
              onChange={(event) => setHelperTextEn(event.target.value)}
              className="min-h-[84px] rounded-md border p-3 text-sm"
              placeholder="Example: This email contains an update created from the admin console."
            />
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
            {isQueueAvailableCampaign ? (
              <Button variant="outline" onClick={() => router.push(`/admin/emails/${campaignId}/queue`)}>
                キュー管理
              </Button>
            ) : null}
            <Button variant="destructive" onClick={handleDeleteCampaign} disabled={isPending}>
              削除
            </Button>
          </>
        )}
      </div>

      {notice && <p className="text-sm text-emerald-700">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
