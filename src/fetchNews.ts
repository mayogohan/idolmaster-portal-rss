import type { Article, NewsResponse } from "./types";

const LIST_ENDPOINT =
  "https://cmsapi-frontend.idolmaster-official.jp/sitern/api/idolmaster/Article/list";

export async function fetchNews(token: string, limit = 50): Promise<Article[]> {
  const params = new URLSearchParams({
    site: "jp",
    ip: "idolmaster",
    token,
    sort: "desc",
    limit: String(limit),
    data: JSON.stringify({ category: ["NEWS"] }),
  });
  const response = await fetch(`${LIST_ENDPOINT}?${params}`);
  if (!response.ok) {
    throw new Error(
      `News fetch failed: ${response.status} ${response.statusText}`,
    );
  }
  const json = (await response.json()) as NewsResponse;
  if (json.statusCode !== 200 || json.data === false) {
    throw new Error(`Invalid news response: statusCode=${json.statusCode}`);
  }
  return json.data.article_list;
}
