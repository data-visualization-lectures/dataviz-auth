// app/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import { fetchMe, createCheckoutSession, createPortalSession } from "@/lib/apiClient";
import { toast } from "sonner";
import { MeResponse } from "@/types/user";
import { formatSubscriptionStatus } from "@/lib/formatters";


export default function AccountPage() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchMe();
        setData(res);
      } catch (e: any) {
        setError(e.message ?? "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleUpgrade() {
    try {
      const { url } = await createCheckoutSession();
      if (url) {
        window.location.href = url;
      }
    } catch (e: any) {
      toast.error(`Checkout開始に失敗しました: ${e.message ?? e}`);
    }
  }

  async function handleManageBilling() {
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (e: any) {
      toast.error(`ポータル起動に失敗しました: ${e.message ?? e}`);
    }
  }

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;
  if (!data) return <p>ログインしていないようです。</p>;

  // subscriptionオブジェクト自体が無い場合は"none"扱い
  const rawStatus = data.subscription?.status ?? "none";
  const displayStatus = formatSubscriptionStatus(data.subscription);

  // ボタン表示判定: active かつ キャンセル予約していない場合のみ「管理」ボタン
  // 解約予約中(activeかつcancel_at_period_end=true)の場合、あるいはすでにcanceledなどの場合は「アップグレード(再開)」等のハンドリングが必要かもしれないが、
  // 現状の要件では特段指定がないので、シンプルに active なら管理ボタン、それ以外ならアップグレードボタン、とするか、
  // もしくは「解約予約中」でもポータルで「キャンセルを取り消す」ができるかもしれないので管理ボタンのままがいいかもしれない。
  // Stripe Portal は通常、解約予約中の場合の「再開」もサポートする。
  // ユーザーの要件: ステータス表示の変更が主。
  // ボタンの出し分けロジックは既存に従う ('active' ? manage : upgrade)。
  // 解約予約中でも status 自体は 'active' のまま返ってくるのが一般的な Stripe/Supabase の挙動 (cancel_at_period_end が true なだけ)。
  // なので、status === 'active' の判定で管理画面に行けるはず。

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">アカウント</h1>

      <section className="space-y-1">
        <div>ユーザーID: {data.user.id}</div>
        <div>メールアドレス: {data.user.email}</div>
        <div>表示名: {data.profile?.display_name ?? "（未設定）"}</div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">サブスクリプション</h2>
        <div>現在のステータス: <strong>{displayStatus}</strong></div>

        {rawStatus === "active" ? (
          <button
            className="px-4 py-2 rounded bg-gray-800 text-white"
            onClick={handleManageBilling}
          >
            支払い情報を確認・変更
          </button>
        ) : (
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white"
            onClick={handleUpgrade}
          >
            有料プランにアップグレード
          </button>
        )}
      </section>
    </main>
  );
}