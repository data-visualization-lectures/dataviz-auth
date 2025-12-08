# 目的: ログイン後のセッションを .dataviz.jp で共有する

## 選択肢A: JSでクッキー書き込み
- 内容: クライアント側で document.cookie に .dataviz.jp を書く
- 試行: 実施
- 結果: ブラウザ設定/Supabase内部で無視・上書きされ、auth.dataviz.jp にしか付かない。セッション復元でエラーも発生。

## 選択肢B: サーバーで Set-Cookie を返す
- B1: 公式フォーマットそのまま JSON を値にし、Domain=.dataviz.jp  
  - 試行: 何度か実施（URLエンコードなし/あり、フィールド削減など混在）  
  - 結果: 公式形を崩したり文字種/サイズでブラウザに拒否され、authのみ。NetworkでSet-Cookie確認できず。  
- B2: クッキー値を安全な文字列に変換して配布（例: Base64で公式フォーマットを保持）  
  - 試行: 実施（公式フォーマットをBase64でSet-Cookie）  
  - 結果: `.dataviz.jp` に定着せず、authのみ。クライアント側がlocalStorageのままなのも影響。Storage切替とセットで再検証が必要。  
  - 注意（cookie.md/cookie_b.md から再確認）: 必ず https://auth.dataviz.jp で呼ぶこと、`Domain=.dataviz.jp; Path=/; SameSite=Lax(or None); Secure` を付けること、Set-Cookie をレスポンスヘッダーで返すこと（JS書き込みは避ける）。安全な文字列（Base64等）で、秘密鍵やサービスロールキーは入れない。

## 選択肢C: クライアント側のストレージ
- C1: Supabaseデフォルト（localStorage）  
  - 試行: 実施中  
  - 結果: ログインは安定するが、共有されない  
- C2: クッキーを読む storage に切り替え（.dataviz.jpを参照し、必要ならデコード）  
  - 試行: 未実施（以前のJS書き込み版は不完全）  
  - 期待: .dataviz.jp に置いたクッキーをサブドメインで読める。Supabase公式フォーマットを Base64 でデコードして返す実装に揃える。クロスサブドメインから fetch する場合は `credentials: 'include'` と CORS 設定が必要。

## 選択肢D: ミドルウェア
- D1: 無効化  
  - 試行: 実施、ログイン安定  
  - 結果: サーバー側でセッション同期しない  
- D2: 有効化（セッション同期のみ）  
  - 試行: 現在この状態  
  - 結果: ログインは通るが、同期が確実と言えず再検証が必要

## 現状の状態
- B2（Base64で公式フォーマットをSet-Cookieするが、実際はauthのみ。要再検証）  
- C1（localStorage）  
- D2（ミドルウェア有効、動作要再検証）

## 次に取るべき構成（提案）
- B2: 公式フォーマットを Base64 で `/api/auth/set-cookie` から配布（Domain=.dataviz.jp）を維持しつつ、クライアント側とセットで再検証  
- C2: クライアントの storage を .dataviz.jp クッキーを読む実装に変更（Base64デコードでJSON復元）  
- D2は維持（ミドルウェアはセッション同期のみ）
