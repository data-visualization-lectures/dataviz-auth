# auth.dataviz.jp


## CSS Framework

- Tailwind CSS
- Radix UI
- class-variance-authority (cva) 

shadcn/ui のコンポーネントをCLIで追加しながら、独自のデザインシステムを構築する方針。

## ユーザーが「解約」ボタンを押したが、まだ契約期間が残っている状態

subscriptions.cancel_at_period_end

### true

- ユーザーが「解約」ボタンを押したが、まだ契約期間が残っている状態です。
- 現在の期間（月または年）が終わるまではサービスを利用できます。
- 期間終了後、自動的に契約が終了（status が canceled 等になる）し、次の請求は発生しません。
- 意味: 「解約手続き完了。次回更新なし。」

### false

- 通常のサブスクリプション状態です。
- 現在の期間が終了すると、自動的に更新され、次の請求が発生します。
- 意味: 「自動更新有効。継続利用中。」