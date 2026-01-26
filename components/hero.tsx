export function Hero() {
  return (
    <div className="flex flex-col gap-16 items-center">
      <h1 className="sr-only">データ可視化とデータ加工の便利ツール集</h1>
      <div className="text-center mx-auto">
        <br /><br /><br />
        <p className="text-3xl lg:text-4xl !leading-tight">
          データ可視化とデータ加工の便利ツール集
        </p>
        <br />
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          本サービスは現在、過去にご利用いただいたお客さま向けのクローズドテスト期間です。招待コードをお持ちの方のみご利用いただけます。フィードバックをもとに機能改善を行った後、一般公開を予定しています。
        </p>
      </div>
    </div>
  );
}
