import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

import { APP_CONFIG } from '@/lib/config';

const allowedOrigins: readonly string[] = APP_CONFIG.ALLOWED_ORIGINS;
const LOCALE_COOKIE_NAME = 'locale';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Next.jsネイティブルート（Hugoにrewriteされない、localeリダイレクトの対象外）
const NEXT_JS_ROUTES = [
    '/auth', '/account', '/admin', '/api', '/billing', '/campaign',
    '/data-library', '/projects', '/public',
];

type Locale = 'ja' | 'en';

function isLocale(value: string | null | undefined): value is Locale {
    return value === 'ja' || value === 'en';
}

function getPathLocale(pathname: string): Locale {
    return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ja';
}

function getCanonicalPath(pathname: string, locale: Locale): string {
    if (locale === 'en') {
        if (pathname === '/en' || pathname.startsWith('/en/')) {
            return pathname;
        }
        if (pathname === '/') {
            return '/en';
        }
        return `/en${pathname}`;
    }

    // ja: strip /en prefix
    if (pathname === '/en') {
        return '/';
    }
    if (pathname.startsWith('/en/')) {
        return pathname.slice(3) || '/';
    }
    return pathname;
}

function resolveLocale(request: NextRequest): Locale {
    const langParam = request.nextUrl.searchParams.get('lang');
    if (isLocale(langParam)) {
        return langParam;
    }

    const pathLocale = getPathLocale(request.nextUrl.pathname);
    if (pathLocale === 'en') {
        return 'en';
    }

    const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
    if (isLocale(cookieLocale)) {
        return cookieLocale;
    }

    const accept = request.headers.get('accept-language') ?? '';
    const primary = accept.split(',')[0]?.trim().toLowerCase() ?? '';
    return primary.startsWith('ja') ? 'ja' : 'en';
}

function setLocaleCookie(response: NextResponse, locale: Locale, secure: boolean) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
        path: '/',
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure,
    });
}

export async function middleware(request: NextRequest) {
    const useSecureCookie = request.nextUrl.protocol === 'https:';
    const origin = request.headers.get('origin') ?? '';
    // Allow specific origins OR any subdomain of the main domain (securely checked via suffix)
    const isAllowedOrigin = allowedOrigins.includes(origin) ||
        allowedOrigins.some(o => origin.startsWith(o)) ||
        (origin.startsWith("https://") && origin.endsWith(APP_CONFIG.DOMAIN));

    // Handle Preflight Request
    if (request.method === 'OPTIONS') {
        const preflightHeaders = {
            ...(isAllowedOrigin && { 'Access-Control-Allow-Origin': origin }),
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey, content-type',
            'Access-Control-Allow-Credentials': 'true',
        };
        return NextResponse.json({}, { headers: preflightHeaders });
    }

    // Hugoサイト（/以下のツール一覧/詳細ページ）で locale=en の場合は /en へリダイレクト
    // Next.jsネイティブルートは対象外
    const langParam = request.nextUrl.searchParams.get('lang');
    const pathname = request.nextUrl.pathname;
    const isNextJsRoute = NEXT_JS_ROUTES.some(
        (r) => pathname === r || pathname.startsWith(r + '/'),
    );
    const normalizedLocale = resolveLocale(request);
    const hasLangParam = isLocale(langParam);

    // Hugo系URLのみ canonical path へ正規化（lang queryの除去も含む）
    if (!isNextJsRoute) {
        const canonicalPath = getCanonicalPath(pathname, normalizedLocale);
        const shouldRedirect =
            canonicalPath !== pathname ||
            (hasLangParam && request.nextUrl.searchParams.has('lang'));

        if (shouldRedirect) {
            const newUrl = request.nextUrl.clone();
            newUrl.pathname = canonicalPath;
            newUrl.searchParams.delete('lang');
            const redirectResponse = NextResponse.redirect(newUrl);
            setLocaleCookie(redirectResponse, normalizedLocale, useSecureCookie);
            return redirectResponse;
        }
    }

    // Call updateSession (Supabase session handling)
    const response = await updateSession(request);

    // Append CORS headers to the response
    if (isAllowedOrigin) {
        // Warning: if 'Access-Control-Allow-Origin' is already set, this might duplicate it or fail.
        // We set it only if not present or to override.
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, apikey, content-type');
    }

    // lang query param を検知したら locale cookie に永続化（30日）
    // （Hugoへのリダイレクト分岐で捕捉されなかったケース、Next.jsネイティブルート向け）
    if (hasLangParam) {
        setLocaleCookie(response, langParam, useSecureCookie);
    } else if (!isNextJsRoute) {
        // Hugo系: /en 到達時は en、それ以外は ja を cookie に同期
        setLocaleCookie(response, getPathLocale(pathname), useSecureCookie);
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|scss/|ts/|catalog\\.json|data/|lib/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
