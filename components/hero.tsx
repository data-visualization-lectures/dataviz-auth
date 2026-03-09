export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center">
      <h1 className="sr-only">データ可視化とデータ加工の便利ツール集</h1>
      <div className="text-center mx-auto">
        <br /><br /><br />
        <p className="text-3xl lg:text-4xl !leading-tight">
          データ可視化とデータ加工の便利ツール集
        </p>
        <br /><br /><br />
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          Excelよりも多様に、B.I.ツールよりも簡単に、小回りの利くデータ可視化（チャートやデータ地図、ネットワーク図）作成・データ加工ツールをたくさん用意しています。ブラウザですべて完結し、定額で使い放題で利用いただけます。
        </p>
      </div>
      <a href="https://www.dataviz.jp/"><img
        src="/hero-dataviz.png"
        alt="本ツールで出来るチャートのイメージ"
        className="w-full max-w-5xl rounded-lg shadow-sm"
      /></a>
    </div>
  );
}
