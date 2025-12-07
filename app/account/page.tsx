// app/account/page.tsx
"use client";

import { useEffect, useState } from "react";
import { fetchMe, createCheckoutSession, createPortalSession } from "@/lib/apiClient";

type SubscriptionStatus = "none" | "active" | "past_due" | "canceled" | "incomplete" | "trialing";

type MeResponse = {
  user: {
    id: string;
    email: string;
  };
  profile: {
    display_name?: string | null;
  } | null;
  subscription: {
    status: SubscriptionStatus;
  } | null;
};

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
      alert(`Checkout開始に失敗しました: ${e.message ?? e}`);
    }
  }

  async function handleManageBilling() {
    try {
      const { url } = await createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (e: any) {
      alert(`ポータル起動に失敗しました: ${e.message ?? e}`);
    }
  }

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;
  if (!data) return <p>ログインしていないようです。</p>;

  const status = data.subscription?.status ?? "none";

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
        <div>現在のステータス: <strong>{status}</strong></div>

        {status === "active" ? (
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