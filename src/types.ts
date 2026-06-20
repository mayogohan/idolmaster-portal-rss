export interface TokenResponse {
  statusCode: number;
  data: {
    token: string;
    limit: number;
    time: number;
  };
}

export interface NewsResponse {
  statusCode: number;
  data:
    | false
    | {
        total_count: number;
        article_list: Article[];
      };
}

export interface Article {
  _id: number;
  title: string;
  path: string;
  url: string;
  startdate: number;
  dspdate: string;
  thumbnail: string;
  brand: Brand[];
  memberflg: "0" | "1";
  anniversary_flg: "0" | "1";
  listed_subcategories: string;
}

export interface Brand {
  code: string;
  name?: string;
}
