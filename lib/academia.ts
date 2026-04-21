import { createAdminClient } from "@/lib/supabase/admin";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedDomains: string[] | null = null;
let cacheExpiresAt = 0;

async function getAcademiaDomains(): Promise<string[]> {
    const now = Date.now();

    if (cachedDomains !== null && now < cacheExpiresAt) {
        return cachedDomains;
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from("academia_domains")
        .select("domain")
        .eq("is_active", true);

    if (error) {
        console.error("[ERROR] Failed to fetch academia_domains", error);
        if (cachedDomains !== null) {
            console.warn("[WARN] Using stale academia_domains cache due to DB error");
            return cachedDomains;
        }
        return [];
    }

    cachedDomains = (data ?? []).map((row) => row.domain as string);
    cacheExpiresAt = now + CACHE_TTL_MS;

    return cachedDomains;
}

/**
 * サポートするパターン:
 * - `*@example.com`    — ドメイン完全一致
 * - `*@*.example.com`  — 任意のサブドメイン（`example.com` 自体は含まない）
 * - `@example.com`     — 旧形式（後方互換・末尾一致）
 */
export async function isAcademiaEmail(email: string): Promise<boolean> {
    if (!email) return false;
    const normalized = email.toLowerCase();
    const atIdx = normalized.lastIndexOf("@");
    if (atIdx < 0) return false;
    const emailDomain = normalized.substring(atIdx + 1);
    const patterns = await getAcademiaDomains();
    return patterns.some((pattern) =>
        matchDomainPattern(pattern.toLowerCase(), normalized, emailDomain)
    );
}

function matchDomainPattern(pattern: string, email: string, emailDomain: string): boolean {
    if (pattern.startsWith("*@*.")) {
        const suffix = pattern.substring(3);
        return emailDomain.endsWith(suffix) && emailDomain.length > suffix.length;
    }
    if (pattern.startsWith("*@")) {
        return emailDomain === pattern.substring(2);
    }
    return email.endsWith(pattern);
}
