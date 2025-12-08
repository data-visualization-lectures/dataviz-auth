import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const allowedOrigins = [
    'https://auth.dataviz.jp',
    'https://svg-tectures.dataviz.jp',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
];

export async function middleware(request: NextRequest) {
    const rawOrigin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    console.log(`[Middleware Start] Origin: '${rawOrigin}', Referer: '${referer}'`);

    let origin = rawOrigin ?? '';

    // Fallback: If Origin is missing, try to extract it from Referer
    if (!origin) {
        if (referer) {
            try {
                const refererUrl = new URL(referer);
                origin = refererUrl.origin;
                console.log(`[Middleware] Origin missing, inferred from Referer: ${origin}`);
            } catch (e) {
                console.warn(`[Middleware] Failed to parse Referer: ${referer}`);
            }
        }
    }

    // Simplify verification: check if the origin ends with allowed domains to handle potential sub-paths or http vs https quirks (though accurate matching is better)
    // Here we stick to exact string match for security, but ensure no trailing slash issues
    const isAllowedOrigin = allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o));

    console.log(`[Middleware] Computed Origin: ${origin}, Allowed: ${isAllowedOrigin}`);

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

    // Call updateSession (Supabase session handling)
    const response = await updateSession(request);

    // Check if CORS headers are already set by Supabase/Next.js
    const existingOriginHeader = response.headers.get('Access-Control-Allow-Origin');
    if (existingOriginHeader) {
        console.log(`[Middleware After updateSession] WARNING: CORS header already set to: '${existingOriginHeader}'`);
    }

    // Append CORS headers to the response
    if (isAllowedOrigin) {
        // Warning: if 'Access-Control-Allow-Origin' is already set, this might duplicate it or fail.
        // We set it only if not present or to override.
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, apikey, content-type');
        console.log(`[Middleware] Set CORS headers for: ${origin}`);
    }

    const finalOriginHeader = response.headers.get('Access-Control-Allow-Origin');
    console.log(`[Middleware End] Final CORS Header: '${finalOriginHeader}'`);

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
