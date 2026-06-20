# 要件定義 — アイドルマスター ポータル RSS 化システム

## 背景・目的

`https://idolmaster-official.jp/news` はNext.js製のSPAであり、RSS配信機能がない。
公式サイトのCMS APIを利用してニュースを取得し、RSSフィードとして配信するシステムを構築する。

---

## API 調査結果

### 発見したエンドポイント

| エンドポイント                                                                          | 説明                         |
| --------------------------------------------------------------------------------------- | ---------------------------- |
| `GET https://cmsapi-frontend.idolmaster-official.jp/sitern/api/cmsbase/Token/get`       | 一時トークン取得（認証不要） |
| `GET https://cmsapi-frontend.idolmaster-official.jp/sitern/api/idolmaster/Article/list` | ニュース一覧取得             |

### トークン取得レスポンス例

```json
{
  "statusCode": 200,
  "data": {
    "token": "6e6f550239886c8f5f...",
    "limit": 1781946479,
    "time": 0
  }
}
```

- `token`: 記事取得に使用する一時トークン
- `limit`: トークン有効期限（Unixタイムスタンプ、TTL 約1時間）

### ニュース一覧リクエスト

```text
GET /sitern/api/idolmaster/Article/list
  ?site=jp
  &ip=idolmaster
  &token={token}
  &sort=desc
  &limit=50
  &data={"category":["NEWS"]}
```

### 記事データ構造（主要フィールド）

| フィールド             | 型         | 説明                                                               |
| ---------------------- | ---------- | ------------------------------------------------------------------ |
| `_id`                  | number     | 記事ID                                                             |
| `title`                | string     | タイトル                                                           |
| `path`                 | string     | URLパスセグメント（例: `01_19179`）                                |
| `url`                  | string     | 記事URL（例: `https://idolmaster-official.jp/news/01_19179.html`） |
| `startdate`            | number     | 公開日時（Unixタイムスタンプ）                                     |
| `dspdate`              | string     | 表示用日時（例: `2026/06/20 13:30`）                               |
| `thumbnail`            | string     | サムネイル画像パス（相対パス）                                     |
| `brand`                | object[]   | ブランド配列                                                       |
| `memberflg`            | "0" \| "1" | `"0"`: 公開、`"1"`: 会員限定                                       |
| `anniversary_flg`      | "0" \| "1" | 20周年記念フラグ                                                   |
| `listed_subcategories` | string     | カテゴリ                                                           |

---

## 機能要件

| ID   | 要件                                                                                        |
| ---- | ------------------------------------------------------------------------------------------- |
| FR-1 | CMS APIからニュース記事を取得する                                                           |
| FR-2 | 有効なRSS 2.0フィードを生成する                                                             |
| FR-3 | 各フィードアイテムに title / link / pubDate / description / enclosure（サムネイル）を含める |
| FR-4 | フィードは最新50件に絞る                                                                    |
| FR-5 | 15〜30分ごとにフィードを自動更新する                                                        |

---

## 非機能要件

| ID    | 要件                                             |
| ----- | ------------------------------------------------ |
| NFR-1 | フィードURLは固定・安定していること              |
| NFR-2 | フィード生成は30秒以内に完了すること             |
| NFR-3 | APIエラー時は前回生成済みのフィードを維持する    |
| NFR-4 | 利用者側に認証不要でフィードにアクセスできること |

---

## アーキテクチャ

```text
GitHub Actions (cron: */15 * * * *)
  └─ Node.js スクリプト (TypeScript)
       ├─ 1. CMS Token 取得
       │       GET cmsbase/Token/get
       ├─ 2. ニュース一覧取得（最新50件）
       │       GET idolmaster/Article/list
       ├─ 3. RSS 2.0 XML 生成
       └─ 4. public/ 以下に出力 → gh-pages ブランチへ push
                └─ GitHub Pages で配信
                     └─ https://{user}.github.io/idolmaster-portal-rss/rss.xml
```

---

## 技術スタック

| 要素             | 選定                 | 理由                        |
| ---------------- | -------------------- | --------------------------- |
| 言語             | TypeScript (Node.js) | 型安全・エコシステム        |
| HTTPクライアント | `node-fetch`         | 軽量                        |
| RSS生成          | `feed` npm package   | RSS 2.0 / Atom 双方対応     |
| CI/CD            | GitHub Actions       | 無料・cron スケジュール対応 |
| ホスティング     | GitHub Pages         | 無料・安定                  |

---

## ディレクトリ構成（予定）

```text
idolmaster-portal-rss/
├── doc/
│   └── requirements.md        # 本ドキュメント
├── src/
│   ├── fetchToken.ts           # CMS トークン取得
│   ├── fetchNews.ts            # ニュース一覧取得
│   ├── generateFeed.ts         # RSS/Atom 生成
│   └── index.ts                # エントリーポイント
├── public/
│   └── rss.xml                 # 生成済みフィード（GitHub Pages で配信）
├── .github/
│   └── workflows/
│       └── update-feed.yml     # GitHub Actions ワークフロー
├── package.json
└── tsconfig.json
```

---

## 制約・留意事項

- CMS API は公式サイトのフロントエンドコードを解析して発見したもの。利用規約上の問題が生じた場合は配信を停止すること。
- トークンは毎回再取得すること（TTL 約1時間のため）。
- サムネイルURLは相対パスのため、`https://cmsapi-frontend.idolmaster-official.jp` を前置して絶対URLに変換すること。
