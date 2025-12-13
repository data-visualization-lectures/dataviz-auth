import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

import { APP_CONFIG } from '@/lib/config';

const allowedOrigins: readonly string[] = APP_CONFIG.ALLOWED_ORIGINS;


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

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
