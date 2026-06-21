import { Feed } from "feed";
import type { Article } from "./types";

const IMAGE_ENDPOINT =
  "https://cmsapi-frontend.idolmaster-official.jp/sitern/api/idolmaster/Image/get";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

function resolveMimeType(path: string | undefined): string {
  const ext = path?.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "image/jpeg";
}

function resolveFeedUrl(): string {
  const repo = process.env.GITHUB_REPOSITORY; // "owner/repo" (set by GitHub Actions)
  if (repo) {
    const [owner, repoName] = repo.split("/");
    return `https://${owner}.github.io/${repoName}/rss.xml`;
  }
  return "https://mayogohan.github.io/idolmaster-portal-rss/rss.xml";
}

export function generateFeed(articles: Article[]): string {
  const feed = new Feed({
    title: "アイドルマスター ポータル ニュース",
    description: "アイドルマスター（アイマス）シリーズの最新ニュース",
    id: "https://idolmaster-official.jp/news",
    link: "https://idolmaster-official.jp/news",
    language: "ja",
    copyright: "©窪岡俊之 THE IDOLM@STER™ & ©Bandai Namco Entertainment Inc.",
    feedLinks: {
      rss: resolveFeedUrl(),
    },
  });

  for (const article of articles) {
    const thumbnailPath = article.thumbnail?.split("?")[0];
    const imageUrl = thumbnailPath
      ? `${IMAGE_ENDPOINT}?path=${thumbnailPath}`
      : undefined;

    feed.addItem({
      title: article.title,
      link: article.url,
      id: article.url,
      date: new Date(article.startdate * 1000),
      description: `<img src="${imageUrl ?? ""}" /><p>${article.title}</p>`,
      image: imageUrl
        ? { url: imageUrl, type: resolveMimeType(thumbnailPath), length: 0 }
        : undefined,
    });
  }

  return feed.rss2();
}
