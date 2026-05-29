# scoutingquestionform

GitHub Pagesで公開する、ボーイスカウト向けの質問フォームです。

## ページ

- `question-1.html`
- `question-2.html`
- `question-3.html`
- `question-4.html`
- `showall.html`

## メモ

回答はGoogle Apps Script経由でGoogleスプレッドシートに保存します。
4つの質問ページは同じ送信先を使います。
送信データには `questionId` と `questionTitle` が含まれるため、どのページからの回答か判別できます。
