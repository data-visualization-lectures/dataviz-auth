import type { NextConfig } from "next";

const HUGO_APP_ORIGIN = "https://dataviz-jp-app.vercel.app";

const TARGET_CATEGORIES =
  "data-visualization|data-visualization-map|data-visualization-parts|data-visualization-color|data-wrangling|data-wrangling-map";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/catalog.json",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/data/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
      {
        source: "/lib/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
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
        // catch-all: Next.jsページに該当しないパスはHugoへ転送
        {
          source: "/:path*",
          destination: `${HUGO_APP_ORIGIN}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
