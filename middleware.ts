import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

import { APP_CONFIG } from '@/lib/config';

const allowedOrigins: readonly string[] = APP_CONFIG.ALLOWED_ORIGINS;

// Next.jsネイティブルート（Hugoにrewriteされない、localeリダイレクトの対象外）
const NEXT_JS_ROUTES = [
    '/auth', '/account', '/admin', '/api', '/billing', '/campaign',
    '/data-library', '/faq', '/pricing', '/projects', '/public', '/terms',
];


export async function middleware(request: NextRequest) {
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
    const isAlreadyEn = pathname === '/en' || pathname.startsWith('/en/');
    const effectiveLocale =
        langParam === 'en' || langParam === 'ja'
            ? langParam
            : request.cookies.get('locale')?.value;

    if (effectiveLocale === 'en' && !isNextJsRoute && !isAlreadyEn) {
        const newUrl = request.nextUrl.clone();
        newUrl.pathname = '/en' + pathname;
        newUrl.searchParams.delete('lang');
        const redirectResponse = NextResponse.redirect(newUrl);
        // 初回訪問（query param 経由）の場合は Cookie も設定しておく
        if (langParam === 'ja' || langParam === 'en') {
            redirectResponse.cookies.set('locale', langParam, {
                path: '/',
                maxAge: 60 * 60 * 24 * 30,
                sameSite: 'lax',
                secure: true,
            });
        }
        return redirectResponse;
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
    if (langParam === 'ja' || langParam === 'en') {
        response.cookies.set('locale', langParam, {
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
            sameSite: 'lax',
            secure: true,
        });
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|categories/|scss/|ts/|catalog\\.json|data/|lib/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
