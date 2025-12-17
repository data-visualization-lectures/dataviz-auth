import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

// @ts-ignore
function corsHeaders(origin: string) {
    return {
        "Access-Control-Allow-Origin": APP_CONFIG.ALLOWED_ORIGINS.includes(origin as any)
            ? origin
            : APP_CONFIG.ALLOWED_ORIGINS[0],
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
    };
}

export async function OPTIONS(request: Request) {
    const origin = request.headers.get("origin") || "";
    return NextResponse.json({}, { headers: corsHeaders(origin) });
}

// LIST Projects
export async function GET(request: Request) {
    const origin = request.headers.get("origin") || "";
    const { searchParams } = new URL(request.url);
    const appName = searchParams.get("app");

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders(origin) }
        );
    }

    let query = supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

    if (appName) {
        query = query.eq("app_name", appName);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500, headers: corsHeaders(origin) }
        );
    }

    return NextResponse.json(data, { headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
    const origin = request.headers.get("origin") || "";
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders(origin) }
        );
    }

    // Subscription check
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

    if (!subscription) {
        return NextResponse.json(
            { error: "Subscription required" },
            { status: 403, headers: corsHeaders(origin) }
        );
    }

    try {
        const json = await request.json();
        const { name, app_name, data } = json;

        if (!name || !app_name || !data) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders(origin) });
        }

        // 1. Generate UUID
        const uuid = crypto.randomUUID();

        // 2. Upload JSON to Storage
        const storagePath = `${user.id}/${uuid}.json`;
        const { error: uploadError } = await supabase.storage
            .from("user_projects")
            .upload(storagePath, JSON.stringify(data), {
                contentType: "application/json",
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 3. Insert DB
        const { error: dbError } = await supabase
            .from("projects")
            .insert({
                id: uuid,
                user_id: user.id,
                name,
                app_name,
                storage_path: storagePath,
            });

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, id: uuid }, { headers: corsHeaders(origin) });

    } catch (e: any) {
        return NextResponse.json(
            { error: e.message || "Internal Server Error" },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
