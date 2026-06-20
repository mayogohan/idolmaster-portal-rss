import * as fs from "fs";
import { fetchToken } from "./fetchToken";
import { fetchNews } from "./fetchNews";
import { generateFeed } from "./generateFeed";

async function main(): Promise<void> {
  const token = await fetchToken();
  const articles = await fetchNews(token, 50);
  const xml = generateFeed(articles);

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync("public/rss.xml", xml, "utf-8");
  console.log(`rss.xml updated: ${articles.length} items`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
