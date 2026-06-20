import { Feed } from "feed";
import type { Article } from "./types";

const THUMBNAIL_BASE = "https://cmsapi-frontend.idolmaster-official.jp";

export function generateFeed(articles: Article[]): string {
  const feed = new Feed({
    title: "アイドルマスター ポータル ニュース",
    description: "アイドルマスター（アイマス）シリーズの最新ニュース",
    id: "https://idolmaster-official.jp/news",
    link: "https://idolmaster-official.jp/news",
    language: "ja",
    copyright: "©窪岡俊之 THE IDOLM@STER™ & ©Bandai Namco Entertainment Inc.",
    feedLinks: {
      rss: "https://mayogohan.github.io/idolmaster-portal-rss/rss.xml",
    },
  });

  for (const article of articles) {
    const imageUrl = article.thumbnail
      ? THUMBNAIL_BASE + article.thumbnail
      : undefined;

    feed.addItem({
      title: article.title,
      link: article.url,
      id: article.url,
      date: new Date(article.startdate * 1000),
      description: `<img src="${imageUrl ?? ""}" /><p>${article.title}</p>`,
      image: imageUrl,
    });
  }

  return feed.rss2();
}
