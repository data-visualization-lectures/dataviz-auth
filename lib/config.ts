export const APP_CONFIG = {
    DOMAIN: ".dataviz.jp",
    COOKIE_NAME: "sb-dataviz-auth-token",
    ALLOWED_ORIGINS: [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://rawgraphs.dataviz.jp",
        "https://kepler-gl.dataviz.jp/",
        "https://cartogram-japan.dataviz.jp/",
        "https://cartogram-prefectures.dataviz.jp/"
    ],
    TOOL_URLS: {
        "rawgraphs": "https://rawgraphs.dataviz.jp",
        "kepler-gl": "https://kepler-gl.dataviz.jp/",
        "cartogram-japan": "https://cartogram-japan.dataviz.jp/",
        "cartogram-prefectures": "https://cartogram-prefectures.dataviz.jp/"
    }
} as const;
