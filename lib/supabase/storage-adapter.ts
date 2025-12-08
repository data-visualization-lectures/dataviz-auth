import { CookieOptions } from "@supabase/ssr";

export interface StorageAdapter {
    getItem(key: string): string | null | Promise<string | null>;
    setItem(key: string, value: string): void | Promise<void>;
    removeItem(key: string): void | Promise<void>;
}

/**
 * Custom storage adapter to handle Base64-encoded session cookies
 * for cross-subdomain sharing (.dataviz.jp).
 */
export const CookieStorageAdapter: StorageAdapter = {
    getItem: (key: string) => {
        if (typeof document === "undefined") return null;

        // Check if the cookie exists
        const value = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${key}=`))
            ?.split("=")[1];

        if (!value) return null;

        try {
            // The server sets it as Base64 encoded JSON
            // Value format: base64(JSON.stringify({ currentSession, expiresAt }))
            // But Supabase Client expects just the JSON string of the session, 
            // OR a JSON object relative to the key structure (depending on how internal logic works).
            // However, usually Supabase `storage` expects the *raw string* that was saved.
            // But here we are bridging:
            // Server saves: Base64({ currentSession, expiresAt })
            // Supabase expects: JSON(session)

            // Let's decode to see what we have
            const decodedJson = JSON.parse(atob(value));

            // If the structure is { currentSession, expiresAt }, we extract currentSession
            if (decodedJson.currentSession) {
                return JSON.stringify(decodedJson.currentSession);
            }

            // Fallback if it was just the session
            return JSON.stringify(decodedJson);
        } catch (e) {
            console.error("Failed to parse cookie value", e);
            return null;
        }
    },
    setItem: (key: string, value: string) => {
        if (typeof document === "undefined") return;

        try {
            // Value comes in as JSON string of the session from Supabase
            const session = JSON.parse(value);

            // Re-encode to match the server-side format:
            // { currentSession: session, expiresAt: ... }
            // We need to calculate expiresAt for consistency with server logic if possible, 
            // but strictly speaking, if we just want to save what Supabase gave us:

            const now = Math.round(Date.now() / 1000);
            const expiresAt = session.expires_at ?? (now + 60 * 60 * 24 * 7);

            const cookieValue = btoa(JSON.stringify({
                currentSession: session,
                expiresAt
            }));

            // Set cookie for .dataviz.jp
            const domain = ".dataviz.jp";
            const maxAge = session.expires_in ?? 60 * 60 * 24 * 7;

            document.cookie = `${key}=${cookieValue}; path=/; domain=${domain}; max-age=${maxAge}; SameSite=Lax; Secure`;
        } catch (e) {
            console.error("Failed to stringify/encode session", e);
        }
    },
    removeItem: (key: string) => {
        if (typeof document === "undefined") return;
        document.cookie = `${key}=; path=/; domain=.dataviz.jp; max-age=0; SameSite=Lax; Secure`;
    },
};
