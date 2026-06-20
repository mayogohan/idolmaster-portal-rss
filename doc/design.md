# 設計書 — アイドルマスター ポータル RSS 化システム

## 1. モジュール構成

```text
src/
├── types.ts          # 共通型定義
├── fetchToken.ts     # CMS トークン取得
├── fetchNews.ts      # ニュース一覧取得
├── generateFeed.ts   # RSS フィード生成
└── index.ts          # エントリーポイント（処理の統合）
```

各モジュールの責務は単一に保ち、`index.ts` がオーケストレーションを担う。

---

## 2. シーケンス図

```text
index.ts
  │
  ├─[1]─► fetchToken()
  │         GET cmsbase/Token/get
  │         ◄── { token: string }
  │
  ├─[2]─► fetchNews(token, limit=50)
  │         GET idolmaster/Article/list?...
  │         ◄── Article[]
  │
  ├─[3]─► generateFeed(articles)
  │         ◄── RSS XML string
  │
  └─[4]─► fs.writeFileSync("public/rss.xml", xml)
```

エラーが発生した場合は即座に `process.exit(1)` し、
GitHub Actions の失敗として記録する（既存の `public/rss.xml` は上書きされない）。

---

## 3. 型定義 (`src/types.ts`)

```typescript
/** CMS Token/get レスポンス */
export interface TokenResponse {
  statusCode: number;
  data: {
    token: string;
    limit: number; // 有効期限 (Unix timestamp)
    time: number;
  };
}

/** Article/list レスポンス */
export interface NewsResponse {
  statusCode: number;
  data:
    | false
    | {
        total_count: number;
        article_list: Article[];
      };
}

/** 記事データ */
export interface Article {
  _id: number;
  title: string;
  path: string;
  url: string;
  startdate: number; // Unix timestamp (秒)
  dspdate: string; // 例: "2026/06/20 13:30"
  thumbnail: string; // 相対パス。例: /idolmaster/jp/article/...
  brand: Brand[];
  memberflg: "0" | "1";
  anniversary_flg: "0" | "1";
  listed_subcategories: string;
}

export interface Brand {
  code: string;
  name?: string;
}
```

---

## 4. モジュール設計

### 4-1. `fetchToken.ts`

```typescript
const TOKEN_ENDPOINT =
  "https://cmsapi-frontend.idolmaster-official.jp/sitern/api/cmsbase/Token/get";

export async function fetchToken(): Promise<string>;
```

#### 処理フロー（fetchToken.ts）

1. `TOKEN_ENDPOINT` に GET リクエストを送信
2. レスポンスを `TokenResponse` として解釈
3. `statusCode !== 200` または `data.token.trim()` が空文字の場合は `Error` をthrow
4. `data.token` を返す

---

### 4-2. `fetchNews.ts`

```typescript
const LIST_ENDPOINT =
  "https://cmsapi-frontend.idolmaster-official.jp/sitern/api/idolmaster/Article/list";

export async function fetchNews(token: string, limit = 50): Promise<Article[]>;
```

#### リクエストパラメータ

| パラメータ | 値                                                                 |
| ---------- | ------------------------------------------------------------------ |
| `site`     | `"jp"`                                                             |
| `ip`       | `"idolmaster"`                                                     |
| `token`    | 取得したトークン                                                   |
| `sort`     | `"desc"`（新着順）                                                 |
| `limit`    | `50`                                                               |
| `data`     | `JSON.stringify({ category: ["NEWS"] })` をURLエンコードした文字列 |

#### 処理フロー（fetchNews.ts）

1. クエリパラメータを組み立てて GET リクエストを送信
2. レスポンスを `NewsResponse` として解釈
3. `statusCode !== 200` または `data === false` の場合は `Error` をthrow
4. `data.article_list` を返す

---

### 4-3. `generateFeed.ts`

```typescript
export function generateFeed(articles: Article[]): string;
```

#### 処理フロー（generateFeed.ts）

1. `feed` パッケージの `Feed` インスタンスを生成（チャンネルメタ情報を設定）
2. 各 `Article` を `FeedItem` に変換して追加
3. `feed.rss2()` で RSS 2.0 XML 文字列を生成して返す

#### チャンネルメタ情報

| フィールド      | 値                                                             |
| --------------- | -------------------------------------------------------------- |
| `title`         | `アイドルマスター ポータル ニュース`                           |
| `description`   | `アイドルマスター（アイマス）シリーズの最新ニュース`           |
| `id`            | `https://idolmaster-official.jp/news`                          |
| `link`          | `https://idolmaster-official.jp/news`                          |
| `language`      | `ja`                                                           |
| `copyright`     | `©窪岡俊之 THE IDOLM@STER™ & ©Bandai Namco Entertainment Inc.` |
| `feedLinks.rss` | `https://mayogohan.github.io/idolmaster-portal-rss/rss.xml`    |

#### Article → FeedItem 変換ルール

| FeedItem フィールド | 変換元                                | 変換方法                                 |
| ------------------- | ------------------------------------- | ---------------------------------------- |
| `title`             | `article.title`                       | そのまま                                 |
| `link`              | `article.url`                         | そのまま                                 |
| `id`                | `article.url`                         | そのまま                                 |
| `date`              | `article.startdate`                   | `new Date(startdate * 1000)`             |
| `description`       | `article.title` + サムネイル img タグ | HTML文字列として組み立て                 |
| `image`             | `article.thumbnail`                   | `THUMBNAIL_BASE + thumbnail` で絶対URL化 |

#### サムネイルURL解決

```typescript
const THUMBNAIL_BASE = "https://cmsapi-frontend.idolmaster-official.jp";
// thumbnail が "/" 始まりの相対パスの場合
const imageUrl = thumbnail ? THUMBNAIL_BASE + thumbnail : undefined;
```

---

### 4-4. `index.ts`

```typescript
async function main(): Promise<void> {
  // 1. トークン取得
  const token = await fetchToken();

  // 2. ニュース取得
  const articles = await fetchNews(token, 50);

  // 3. フィード生成
  const xml = generateFeed(articles);

  // 4. ファイル出力
  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync("public/rss.xml", xml, "utf-8");
  console.log(`rss.xml updated: ${articles.length} items`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## 5. 生成される RSS フィードの構造

```xml
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>アイドルマスター ポータル ニュース</title>
    <link>https://idolmaster-official.jp/news</link>
    <description>アイドルマスター（アイマス）シリーズの最新ニュース</description>
    <language>ja</language>
    <lastBuildDate>Sat, 20 Jun 2026 07:00:00 +0000</lastBuildDate>
    <atom:link href="{フィードの自URL}" rel="self" type="application/rss+xml"/>

    <item>
      <title><![CDATA[記事タイトル]]></title>
      <link>https://idolmaster-official.jp/news/01_19179.html</link>
      <guid>https://idolmaster-official.jp/news/01_19179.html</guid>
      <pubDate>Fri, 20 Jun 2026 13:30:00 +0900</pubDate>
      <description><![CDATA[
        <img src="https://cmsapi-frontend.idolmaster-official.jp/idolmaster/jp/article/..." />
        <p>記事タイトル</p>
      ]]></description>
    </item>
    ...
  </channel>
</rss>
```

---

## 6. エラーハンドリング方針

| ケース                                             | 対処                                                 |
| -------------------------------------------------- | ---------------------------------------------------- |
| トークン取得 HTTP エラー                           | `Error` をthrow → `main()` catch → `process.exit(1)` |
| トークン取得レスポンス異常（`statusCode !== 200`） | 同上                                                 |
| ニュース取得 HTTP エラー                           | 同上                                                 |
| ニュース取得レスポンス異常（`data === false`）     | 同上                                                 |
| ファイル書き込みエラー                             | 同上                                                 |

`process.exit(1)` によって GitHub Actions の step が失敗となり、
`public/rss.xml` はコミットされないため **既存フィードが維持される**（NFR-3 を満たす）。

---

## 7. GitHub Actions ワークフロー設計

ファイル: `.github/workflows/update-feed.yml`

```text
トリガー:
  - schedule: cron '*/15 * * * *'  （15分ごと）
  - workflow_dispatch               （手動実行）

ジョブ: update-feed
  実行環境: ubuntu-latest

  ステップ:
  1. actions/checkout@v4         … ソースチェックアウト
  2. actions/setup-node@v4       … Node.js 22.x セットアップ（npm cache 有効）
  3. npm ci                       … 依存関係インストール
  4. npm run generate             … src/index.ts を実行して public/rss.xml を生成
  5. peaceiris/actions-gh-pages@v4 … public/ を gh-pages ブランチへデプロイ
```

### deploy ステップの設定

| 設定項目         | 値                                 |
| ---------------- | ---------------------------------- |
| `github_token`   | `${{ secrets.GITHUB_TOKEN }}`      |
| `publish_dir`    | `./public`                         |
| `commit_message` | `chore: update RSS feed [skip ci]` |
| `force_orphan`   | `true`（履歴を蓄積しない）         |

`[skip ci]` を付与することで gh-pages ブランチへの push が再度ワークフローを起動しないようにする。

---

## 8. package.json スクリプト設計

```json
{
  "scripts": {
    "generate": "tsx src/index.ts",
    "build": "tsc --noEmit",
    "lint": "eslint src",
    "format": "prettier --write src"
  }
}
```

---

## 9. 依存パッケージ

| パッケージ          | バージョン | 用途                          |
| ------------------- | ---------- | ----------------------------- |
| `feed`              | `^5.x`     | RSS 2.0 / Atom フィード生成   |
| `typescript`        | `^5.x`     | TypeScript コンパイラ         |
| `tsx`               | `^4.x`     | TypeScript の直接実行         |
| `@types/node`       | `^22.x`    | Node.js 型定義                |
| `eslint`            | `^9.x`     | リント                        |
| `typescript-eslint` | `^8.x`     | TypeScript 向け ESLint ルール |
| `prettier`          | `^3.x`     | コードフォーマット            |

> **注:** HTTP リクエストは Node.js 22 のネイティブ `fetch` を使用するため `node-fetch` は不要。

---

## 10. 配信 URL

GitHub Pages を有効化後、以下の URL でフィードにアクセスできる。

<https://mayogohan.github.io/idolmaster-portal-rss/rss.xml>

---

## 11. 初回セットアップ手順

ワークフロー初回実行前に、以下の2つをリポジトリの Settings から手動で設定する。
それ以降の更新は完全自動で行われる。

### 手順 1 — Workflow permissions の変更

> Settings → Actions → General → Workflow permissions

`Read and write permissions` を選択して Save。

デフォルトの `Read repository contents and packages permissions`（read-only）のままでは、
ワークフローが `gh-pages` ブランチへ push できず失敗する。

### 手順 2 — GitHub Pages の有効化

> Settings → Pages → Build and deployment → Source

`Deploy from a branch` を選択し、Branch に `gh-pages` / `/ (root)` を指定して Save。

初回は `gh-pages` ブランチが存在しないため、**ワークフローを一度手動実行（workflow_dispatch）してから** この設定を行う。

```text
実施順序:
  1. コードを main ブランチに push
  2. Actions タブ → "Update RSS Feed" → "Run workflow" で手動実行
        └─ gh-pages ブランチが生成される
  3. Settings → Pages で gh-pages ブランチを Source に指定
        └─ 以降は cron で自動更新
```
