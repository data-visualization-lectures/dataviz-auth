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
  - 失敗の学び: セッションの公式フォーマット（`{currentSession, expiresAt}`）を壊すとSupabaseが復元できずログイン不能になる。クライアント/サーバーで storageKey・フォーマットを一致させることが必須。クライアント側も cookie を読む実装に切り替えないと、サーバー配布だけでは効果が出ない。

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
- **B2 + C2 (実装済み・検証済み)**
  - サーバー/プロキシ: Base64で公式フォーマットをラップして `Domain=.dataviz.jp` に `Set-Cookie` する。
  - クライアント: カスタムストレージアダプター (`CookieStorageAdapter`) を実装し、`.dataviz.jp` のBase64クッキーを直接読み書きする。
  - **結果**: ログイン成功、およびクロスドメインでのクッキー共有（書き込み・読み出し）の動作を確認済み。

## 採用した構成 (Strategy C2)
- **サーバー/API**: 全て `routes`, `proxy`, `server.ts` で Base64 エンコード/デコード処理を統一。
- **クライアント**: `localStorage` を廃止し、`document.cookie` を直接操作するアダプターに切り替え。
- **データフォーマット**: Supabase の厳密な仕様（JSON または 生文字列）を守るため、Base64デコード後に型チェックを行い、必要に応じて生の値を返すロジックを実装。
