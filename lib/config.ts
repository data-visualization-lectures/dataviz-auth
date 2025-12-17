export const APP_CONFIG = {
    DOMAIN: ".dataviz.jp",
    COOKIE_NAME: "sb-dataviz-auth-token",
    ALLOWED_ORIGINS: [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://rawgraphs.dataviz.jp",
        "https://svg-textures.dataviz.jp",
    ],
    TOOL_URLS: {
        "rawgraphs": "https://rawgraphs.dataviz.jp",
        "svg-textures": "https://svg-textures.dataviz.jp",
    }
} as const;
