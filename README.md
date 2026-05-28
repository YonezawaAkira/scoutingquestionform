# scoutingquestionform

GitHub Pagesで公開する、ボーイスカウト向けの質問フォームです。

## ページ

- `question-1.html`: あなたがボーイスカウト以外で取り組んでいる仕事・研究・学習・趣味は？
- `question-2.html`: 人生で最もボーイスカウトの知識・経験が生きた瞬間は？
- `question-3.html`: あなたがボーイスカウトに求める魅力・ロマンは？
- `question-4.html`: いつかこんなプログラム・プロジェクトを実施したい！
- `question-5.html`: これだからボーイスカウトはやめられない！(ポジティブなやつ！)

## メモ

GitHub Pagesだけでは回答をサーバーに保存できないため、Formspreeへ送信します。

## Formspreeの設定

1. Formspreeでフォームを1つ作成します。
2. 作成したフォームのエンドポイントURLをコピーします。
   - 例: `https://formspree.io/f/abcdwxyz`
3. `script.js` の下記部分をコピーしたURLに変更します。

```js
const FORMSPREE_ENDPOINT = "https://formspree.io/f/your-form-id";
```

5つの質問ページは同じ送信先を使います。
送信データには `questionId` と `questionTitle` が含まれるため、どのページからの回答か判別できます。
