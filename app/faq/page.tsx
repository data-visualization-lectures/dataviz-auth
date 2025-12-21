import { Metadata } from "next";

export const metadata: Metadata = {
    title: "よくある質問",
};

export default function FaqPage() {
    return (
        <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-5 py-10 flex flex-col gap-8">
                <h1 className="text-3xl font-bold">よくある質問</h1>

                <h2 className="text-xl font-bold">dataviz.jpとは何ですか？</h2>
                <p>ExcelやB.I.ツールではカバーしきれない、小回りの聞くチャート作成・データ地図作成・データ加工ツールをたくさん用意しています。定額で使い放題で利用いただけます。</p>

                <h2 className="text-xl font-bold">今すぐ使えますか？</h2>
                <p>現在はサービス構築とテスト中です。2026年1月ごろからサービス提供を開始します。</p>

                <h2 className="text-xl font-bold">何を用意すればいいですか？</h2>
                <p>パソコンとインターネット回線があればお使いいただけます。
                    <ul className="list-disc ml-6 my-2">
                        <li>タブレットやスマホで使えるツールもありますが、操作性はパソコンを前提としているので、おすすめしておりません。</li>
                        <li>ブラウザは、モダンなブラウザであれば問題ないと思います。</li>
                    </ul>
                </p>

                <h2 className="text-xl font-bold">作業したファイルを保存することはできますか？</h2>
                <p>おもにデータ可視化ツールについて、読み込んだデータとツール上の設定をセットで保存しておく機能を提供しています。それらはダッシュボードに一覧表示され、ワンクリックでそのプロジェクトを開くことができます。そのほかのツール（データ加工や色彩設計）は使用後ダウンロードしてご活用いただければと思います。</p>

                <h2 className="text-xl font-bold">プロジェクトとは何ですか？</h2>
                <p>「データそのもの」と「ツール上での操作」をセットで「プロジェクト」と呼んでいます。</p>
            </div>
        </div>
    );
}
