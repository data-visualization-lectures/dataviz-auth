export const APP_CONFIG = {
    DOMAIN: ".dataviz.jp",
    COOKIE_NAME: "sb-dataviz-auth-token",
    ALLOWED_ORIGINS: [
        "https://auth.dataviz.jp",
        "https://svg-tectures.dataviz.jp",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ],
} as const;
