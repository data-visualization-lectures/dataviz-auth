Q. auth.dataviz.jp上でvercel使ってnode functionsで、.dataviz.jpクッキーを書き込むのって難しいのですか？



A. 難しいというより、「条件を1つでも外すと**静かに失敗する**」のでハマりやすい、という感じです。

仕組み自体はシンプルで、



> auth.dataviz.jp で動いている Vercel Node Function のレスポンスで

> Set-Cookie: ...; Domain=.dataviz.jp; ...



を正しく返せれば、ブラウザは .dataviz.jp クッキーを書いてくれます。

が、いくつか前提条件があります。



------





## **1. そもそも「sub → 親ドメインのクッキー」は仕様として OK か？**





はい、OK です。



- サブドメイン (auth.dataviz.jp) から Domain=.dataviz.jp の Cookie を発行すると、

  *.dataviz.jp どのサブドメインにも送られる「共有クッキー」になります。 

- 逆に Domain を付けない場合は「ホスト専用 cookie」になり、auth.dataviz.jp からしか見えません。 





なので、仕様上の「障壁」はありません。



------





## **2. Vercel の Node Function で書くときの典型的な形**





Node (Vercel Serverless) を素で使っている前提で書くと、こんな感じです： 

```
// api/set-cookie.js など
export default function handler(req, res) {
  res.setHeader('Set-Cookie', [
    // 例: セッション cookie
    'session=xxxxx; Path=/; Domain=.dataviz.jp; HttpOnly; Secure; SameSite=Lax; Max-Age=3600'
  ]);

  res.status(200).json({ ok: true });
}
```

ポイントは：



- Domain=.dataviz.jp（先頭のピリオド付き）

  

  - 最近のブラウザは「ピリオド有り／無しを同じ扱いにする」仕様ですが、実際にはピリオド付きの方がサブドメイン共有で安定します、という指摘もあります。 

  

- Path=/ にしておくとドメイン全体で有効

- Secure を付けるなら **HTTPS アクセスでないとブラウザが無視** します 

- 複数 cookie を返すときは Set-Cookie ヘッダーを配列で複数回返す（1行にカンマ連結しない） 





------





## **3. 「auth.dataviz.jp では書けるのに .dataviz.jp ではダメ」になりやすい原因**





ここが本題だと思います。典型的に落とし穴になるのはこのあたりです：





### **(1) そもそもアクセスしているホスト名が vercel.app のまま**





ブラウザは「**今開いているページの eTLD+1（registrable domain）とその親にしか cookie を張れない**」という制約があります。 



もしブラウザがアクセスしているのが



- https://auth-dataviz-jp.vercel.app/api/...





だとすると、Domain=.dataviz.jp は「別ドメイン」なので無視されます。

**必ず https://auth.dataviz.jp/... で呼び出したレスポンスで Set-Cookie させる必要**があります。





### **(2) HTTPS じゃない +** 

### **Secure**

###  **付き**





- http://auth.dataviz.jp でアクセスしつつ Secure を付けた cookie を返すと、

  すべてのモダンブラウザで **その cookie は破棄されます**。 

- ローカルで HTTP で試しているときだけ「Domain=auth.dataviz.jp なら入るけど .dataviz.jp は無視される」ように見えるケースがあります。





本番検証は **必ず HTTPS (https://auth.dataviz.jp)** で確認してください。





### **(3)** 

### **Domain**

###  **の指定違い（ホスト専用 cookie になっている）**





- Set-Cookie: ...; Domain=auth.dataviz.jp

  → これは **auth.dataviz.jp** **にだけ送られる cookie** で、他のサブドメインからは見えません。 

- Set-Cookie: ...; Domain=.dataviz.jp

  → これは auth.dataviz.jp, svg-tectures.dataviz.jp などから見える「共有 cookie」。





「auth 側では見えるのに、別サブドメインから見えない」場合は、Domain の設定をまず疑うといいです。





### **(4) fetch / XHR でセットしていて** 

### **credentials: 'include'**

###  **を付けていない**





もし svg-tectures.dataviz.jp のフロントから

```
await fetch('https://auth.dataviz.jp/api/set-cookie', {
  method: 'POST',
  // ここが重要
  credentials: 'include',
});
```

のように叩いて cookie を張ろうとしている場合、credentials: 'include' を付けないと

**レスポンスの Set-Cookie が無視されます**。これは SameSite というより、

「CORS + cookie」の一般仕様の話です。 



同時にサーバー側レスポンスには



- Access-Control-Allow-Credentials: true
- Access-Control-Allow-Origin: https://svg-tectures.dataviz.jp（* は不可）





が必要です。





### **(5) DevTools の見ているタブが違う**





- Network タブ → レスポンスヘッダーの Set-Cookie を確認
- Application（Storage） → 「Cookies > dataviz.jp」「Cookies > auth.dataviz.jp」それぞれに保存されているか確認





auth.dataviz.jp の方にだけ入っていて .dataviz.jp には無い、というなら上記 (1)〜(4) のどれかが原因のことがほとんどです。



------





## **4. 具体的なチェックリスト**





今の構成を想像しつつ、最低限これを一度に全部満たしているか確認してみてください。



1. ブラウザのアドレスバーが

   https://auth.dataviz.jp/... になっている（vercel.app ではない）

2. Vercel Node Function のレスポンスヘッダーが

   Set-Cookie: name=...; Path=/; Domain=.dataviz.jp; HttpOnly; Secure; SameSite=Lax

   のようになっている（ピリオド付き .dataviz.jp）

3. HTTPS でアクセスしている（http ではない）＋ Secure は付けたままで OK

4. 別サブドメインから fetch で叩くなら credentials: 'include' ＋ 適切な CORS ヘッダー

5. Chrome DevTools の **Application > Cookies > dataviz.jp** を開いて、

   そこに cookie が見えているかを確認





ここまで整っていれば、.dataviz.jp クッキー自体は特別な「障壁」なく書き込めるはずです。

