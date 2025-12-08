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
            // Attempt to decode
            const decodedJson = JSON.parse(atob(value));

            // If the structure is { currentSession, expiresAt }, we extract currentSession
            if (decodedJson.currentSession || decodedJson.expiresAt) {
                const sess = decodedJson.currentSession;
                // If it's an object, stringify it (Supabase expects JSON string for sessions)
                // If it's a primitive string (PKCE, etc.), return as is
                return typeof sess === "object" ? JSON.stringify(sess) : sess;
            }

            // If it decoded but doesn't look like our wrapper, return original or re-stringified?
            // Safer to just return the original value if it doesn't match our specific schema
            return value;
        } catch (e) {
            // If Base64 decode or JSON parse fails, it might be a legacy or raw cookie.
            // Return it as-is to be safe.
            return value;
        }
    },
    setItem: (key: string, value: string) => {
        if (typeof document === "undefined") return;

        try {
            let session;
            let expiresAt;
            let maxAge;

            try {
                // Try to parse as JSON (expected for Session objects)
                session = JSON.parse(value);
            } catch {
                // If parsing fails, treat as a raw string (e.g., PKCE verifier or non-JSON token)
                session = value;
            }

            const now = Math.round(Date.now() / 1000);

            // Determine expiration
            if (typeof session === "object" && session !== null && "expires_at" in session) {
                // It's a session object
                expiresAt = session.expires_at ?? (now + 60 * 60 * 24 * 7);
                maxAge = session.expires_in ?? 60 * 60 * 24 * 7;
            } else {
                // Default for non-session data (1 week)
                expiresAt = now + 60 * 60 * 24 * 7;
                maxAge = 60 * 60 * 24 * 7;
            }

            const cookieValue = btoa(JSON.stringify({
                currentSession: session,
                expiresAt
            }));

            // Set cookie for .dataviz.jp
            const domain = ".dataviz.jp";

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
