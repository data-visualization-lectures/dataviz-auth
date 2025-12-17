import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

function corsHeaders(origin: string) {
    return {
        "Access-Control-Allow-Origin": APP_CONFIG.ALLOWED_ORIGINS.includes(origin)
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

// CREATE Project
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
        const { name, app_name, data, thumbnailBlob } = json;
        // NOTE: 'thumbnailBlob' in JSON? Usually Binary is better updated as FormData, 
        // but plan says: "Body: { name, app_name, data: {...} }" in Step 4.
        // Plan V2 says "cloudApi.js/saveProject ... upload image"

        // For simplicity, we'll assume JSON body for the metadata + main JSON content.
        // However, if we are uploading a BLOB (Thumbnail), multipart/form-data is standard.
        // But the user plan "3. プロジェクト新規保存" showed JSON body.
        // Let's implement basic JSON save first as per Plan V1, and assume V2 updates handles Storage Upload from Client?
        // "Step 3: cloudApi.js ... saveProjectに画像アップロード処理を追加"

        // Actually, usually in Supabase apps, it is better to upload files DIRECTLY to Storage from Client using the SDK, 
        // and then only call API to save the metadata (DB record).
        // BUT the Plan says: "3. メタデータ保存/取得 --> SupabaseDB ... 4. 実データ保存/取得 --> SupabaseStorage"
        // And "API経由" for everything.
        // So the server must handle the upload.

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

        // 3. Upload Thumbnail if present (Not implemented fully in this JSON handler unless base64)
        // If we need to support thumbnail here, we should probably switch to FormData.
        // For now, let's satisfy the immediate "Loading" error which is GET.
        // I will insert the record.

        // 4. Insert DB
        const { error: dbError } = await supabase
            .from("projects")
            .insert({
                id: uuid,
                user_id: user.id,
                name,
                app_name,
                storage_path: storagePath,
                // thumbnail_path: ... (Need to handle image upload)
            });

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, id: uuid }, { headers: corsHeaders(origin) });

    } catch (e) {
        return NextResponse.json(
            // @ts-ignore
            { error: e.message || "Internal Server Error" },
            { status: 500, headers: corsHeaders(origin) }
        );
    }
}
