import type { TokenResponse } from "./types";

const TOKEN_ENDPOINT =
  "https://cmsapi-frontend.idolmaster-official.jp/sitern/api/cmsbase/Token/get";

export async function fetchToken(): Promise<string> {
  const response = await fetch(TOKEN_ENDPOINT);
  if (!response.ok) {
    throw new Error(
      `Token fetch failed: ${response.status} ${response.statusText}`,
    );
  }
  const json = (await response.json()) as TokenResponse;
  if (json.statusCode !== 200 || !json.data.token.trim()) {
    throw new Error(`Invalid token response: statusCode=${json.statusCode}`);
  }
  return json.data.token;
}
