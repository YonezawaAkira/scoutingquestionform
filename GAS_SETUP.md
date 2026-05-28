# Google Sheets / Apps Script setup

## 1. Apps Scriptを作る

1. スプレッドシートを開く
2. `拡張機能` → `Apps Script`
3. `gas/Code.gs` の中身をApps Scriptの `Code.gs` に貼り付ける
4. 保存する

## 2. ウェブアプリとしてデプロイする

1. Apps Script右上の `デプロイ` → `新しいデプロイ`
2. 種類は `ウェブアプリ`
3. 実行するユーザーは `自分`
4. アクセスできるユーザーは `全員`
5. デプロイして、表示されたウェブアプリURLをコピーする

## 3. リポジトリ側にURLを貼る

`script.js` と `showall.js` の先頭にある `GOOGLE_APPS_SCRIPT_URL` に、コピーしたURLを貼る。

```js
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/xxxxxxxx/exec";
```

`script.js` は回答の送信、`showall.js` は回答一覧の取得に使います。
