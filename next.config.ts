import type { NextConfig } from "next";

const HUGO_APP_ORIGIN = "https://dataviz-jp-app.vercel.app";

const TARGET_CATEGORIES =
  "data-visualization|data-visualization-map|data-visualization-parts|data-visualization-color|data-wrangling|data-wrangling-map";

const ID_HOST = "id.dataviz.jp";
const APP_HOST = "app.dataviz.jp";

const nextConfig: NextConfig = {
  async redirects() {
    // 認証/マイページ責務分離: app.dataviz.jp 配下の /lib/* と /catalog.json は
    // id.dataviz.jp 配信に 301 リダイレクト。既存ツールの <script src> は段階移行。
    return [
      {
        source: "/",
        has: [{ type: "host", value: APP_HOST }],
        destination: "/account",
        permanent: false,
      },
      {
        source: "/lib/:path*",
        has: [{ type: "host", value: APP_HOST }],
        destination: `https://${ID_HOST}/lib/:path*`,
        permanent: true,
      },
      {
        source: "/catalog.json",
        has: [{ type: "host", value: APP_HOST }],
        destination: `https://${ID_HOST}/catalog.json`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/catalog.json",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Vary", value: "Origin" },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/data/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Vary", value: "Origin" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/lib/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      afterFiles: [
        // Hugo静的アセット（CSS, JS）
        {
          source: "/scss/:path*",
          destination: `${HUGO_APP_ORIGIN}/scss/:path*`,
        },
        {
          source: "/ts/:path*",
          destination: `${HUGO_APP_ORIGIN}/ts/:path*`,
        },
        // カテゴリ一覧ページ（日本語）
        {
          source: `/categories/:cat(${TARGET_CATEGORIES})/:rest*`,
          destination: `${HUGO_APP_ORIGIN}/categories/:cat/:rest*`,
        },
        // カテゴリ一覧ページ（英語）
        {
          source: `/en/categories/:cat(${TARGET_CATEGORIES})/:rest*`,
          destination: `${HUGO_APP_ORIGIN}/en/categories/:cat/:rest*`,
        },
      ],
      // catch-all: Next.jsの動的ルート解決後に、未解決パスのみHugoへ転送
      fallback: [
        {
          source: "/:path*",
          destination: `${HUGO_APP_ORIGIN}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
