# アイドルマスター ポータル 非公式 RSS

アイドルマスター公式ポータルのニュースを RSS 2.0 フィードとして配信するシステムです。
GitHub Actions が 15 分ごとに自動更新し、GitHub Pages で公開します。

## 免責事項

- 本プロジェクトは **非公式** です。バンダイナムコエンターテインメントおよびアイドルマスターシリーズとは一切関係ありません。
- アイドルマスター公式ポータルが内部で使用している **非公開 API** を利用しています。API の仕様は予告なく変更・廃止される場合があります。
- 本フィードの利用は **自己責任** でお願いします。利用によって生じたいかなる損害についても、作者は責任を負いません。

## フィード URL

```text
https://mayoneez.github.io/idolmaster-portal-rss/rss.xml
```

## 仕組み

```text
fetchToken() → fetchNews() → generateFeed() → public/rss.xml → gh-pages
```

1. CMS API からトークンを取得
2. 最新ニュース 50 件を取得
3. RSS 2.0 XML を生成して `public/rss.xml` に出力
4. GitHub Actions が `gh-pages` ブランチへデプロイ

## 開発

```bash
npm install

npm run generate   # フィードをローカル生成（public/rss.xml）
npm run build      # 型チェック
npm run lint       # ESLint
npm run format     # Prettier
```

## GitHub Pages へ公開する手順

> **注意:** GitHub Pages を無料プランで使用するには **Public リポジトリ** が必要です。

### 1. リポジトリを用意する

このリポジトリを Fork（または Clone して新規 Public リポジトリに push）します。

```bash
git clone https://github.com/mayoneez/idolmaster-portal-rss.git
cd idolmaster-portal-rss
# 自分のリポジトリに向け直す
git remote set-url origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Workflow permissions を変更する

> Settings → Actions → General → Workflow permissions

`Read and write permissions` を選択して Save。
（デフォルトの read-only では `gh-pages` ブランチへの push が失敗します。）

### 3. ワークフローを手動実行する

> Actions → "Update RSS Feed" → Run workflow

初回実行で `gh-pages` ブランチとフィードが生成されます。

### 4. GitHub Pages を有効にする

> Settings → Pages → Build and deployment → Source

`Deploy from a branch` → Branch: `gh-pages` / `/ (root)` → Save。

以降は 15 分ごとに自動更新されます。フィードの URL は次の形式になります。

```text
https://<your-username>.github.io/<your-repo>/rss.xml
```

## 技術スタック

| 用途            | ライブラリ                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------- |
| RSS 生成        | [feed](https://github.com/jpmonette/feed)                                                    |
| TypeScript 実行 | [tsx](https://github.com/privatenumber/tsx)                                                  |
| CI/CD           | GitHub Actions + [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) |
