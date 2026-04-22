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

// 認証/マイページ ドメイン責務分離（id.dataviz.jp / app.dataviz.jp）
const ID_HOST = 'id.dataviz.jp';
const APP_HOST = 'app.dataviz.jp';
// app.dataviz.jp のルート = ツール一覧ページ（layouts/index.html の headerMode=protected 分岐）
// 未購読ユーザーは料金ページへリダイレクト
const TOOLS_LIST_PATHS = new Set(['/', '/en', '/en/']);
// app.dataviz.jp では /auth/* を id.dataviz.jp へリダイレクト（ブラックリスト）
const AUTH_ONLY_PREFIXES = ['/auth'];
// id.dataviz.jp では /auth/* と /api/* のみ許可（ホワイトリスト）
// /api/* は auth ページが内部で使う locale API や emails API 用
// マイページ系（/account, /projects, /data-library, /public, /admin, /billing, /campaign）
// と Hugo fallback ルートは全て 404 or ログイン画面へリダイレクト
const ID_HOST_ALLOWED_PREFIXES = ['/auth', '/api'];
// id.dataviz.jp のルートアクセス時はログイン画面へリダイレクト（ユーザー導線）
const ID_HOST_ROOT_PATHS = new Set(['/', '/en', '/en/']);

function startsWithAnyPrefix(pathname: string, prefixes: readonly string[]): boolean {
    return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

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

function getLocaleCookieDomain(hostname: string): string | undefined {
    const rootDomain = APP_CONFIG.DOMAIN.startsWith('.') ? APP_CONFIG.DOMAIN.slice(1) : APP_CONFIG.DOMAIN;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
        return undefined;
    }
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
        return undefined;
    }
    if (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`)) {
        return rootDomain;
    }
    return undefined;
}

function setLocaleCookie(
    response: NextResponse,
    locale: Locale,
    secure: boolean,
    domain?: string,
) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
        path: '/',
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure,
        ...(domain ? { domain } : {}),
    });
}

export async function middleware(request: NextRequest) {
    const useSecureCookie = request.nextUrl.protocol === 'https:';
    const hostname = request.nextUrl.hostname;
    const pathname = request.nextUrl.pathname;

    // ドメイン責務分離: id.dataviz.jp = 認証専用、app.dataviz.jp = マイページ専用
    // ENV フラグで無効化可能（ロールバック用）
    const splitEnabled = process.env.AUTH_DOMAIN_SPLIT_ENABLED !== 'false';
    if (splitEnabled) {
        if (hostname === ID_HOST && !startsWithAnyPrefix(pathname, ID_HOST_ALLOWED_PREFIXES)) {
            // ルート/en はログイン画面へリダイレクト（ユーザー導線）
            if (ID_HOST_ROOT_PATHS.has(pathname)) {
                const redirectUrl = request.nextUrl.clone();
                redirectUrl.pathname = '/auth/login';
                redirectUrl.search = '';
                return NextResponse.redirect(redirectUrl, 307);
            }
            // それ以外（マイページ系・Hugo fallback 等）は 404
            return new NextResponse('Not Found', { status: 404 });
        }
        if (hostname === APP_HOST && startsWithAnyPrefix(pathname, AUTH_ONLY_PREFIXES)) {
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.host = ID_HOST;
            redirectUrl.protocol = 'https:';
            redirectUrl.port = '';
            return NextResponse.redirect(redirectUrl, 302);
        }
    }

    const localeCookieDomain = getLocaleCookieDomain(hostname);
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
            setLocaleCookie(redirectResponse, normalizedLocale, useSecureCookie, localeCookieDomain);
            return redirectResponse;
        }
    }

    // Call updateSession (Supabase session handling)
    const { response, supabase, userId } = await updateSession(request);

    // updateSession が付与したセッション Cookie を引き継いでリダイレクト
    const redirectWithSession = (url: string | URL, status = 307) => {
        const redirectResponse = NextResponse.redirect(url, status);
        response.cookies.getAll().forEach((cookie) => {
            const { name, value, ...options } = cookie;
            redirectResponse.cookies.set(name, value, options);
        });
        return redirectResponse;
    };

    // ツール一覧（app.dataviz.jp の / または /en）は有料プラン or アドミンのみ許可
    // data-library と同じゲート方針
    if (
        splitEnabled &&
        hostname === APP_HOST &&
        TOOLS_LIST_PATHS.has(pathname) &&
        supabase
    ) {
        if (!userId) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.host = ID_HOST;
            loginUrl.protocol = 'https:';
            loginUrl.port = '';
            loginUrl.pathname = '/auth/login';
            loginUrl.search = '';
            return redirectWithSession(loginUrl);
        }

        const [{ data: subscription }, { data: profile }] = await Promise.all([
            supabase
                .from('subscriptions')
                .select('status, current_period_end')
                .eq('user_id', userId)
                .maybeSingle(),
            supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', userId)
                .maybeSingle(),
        ]);

        const isSubscribed =
            subscription &&
            (subscription.status === 'active' || subscription.status === 'trialing') &&
            (!subscription.current_period_end ||
                new Date(subscription.current_period_end) > new Date());

        if (!isSubscribed && !profile?.is_admin) {
            const pricingUrl =
                normalizedLocale === 'en'
                    ? 'https://www.dataviz.jp/en/pricing/'
                    : 'https://www.dataviz.jp/pricing/';
            return redirectWithSession(pricingUrl);
        }
    }

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
        setLocaleCookie(response, langParam, useSecureCookie, localeCookieDomain);
    } else if (!isNextJsRoute) {
        // Hugo系: /en 到達時は en、それ以外は ja を cookie に同期
        setLocaleCookie(response, getPathLocale(pathname), useSecureCookie, localeCookieDomain);
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|scss/|ts/|catalog\\.json|data/|lib/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
