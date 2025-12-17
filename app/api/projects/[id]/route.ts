import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

// Helper for CORS
function corsHeaders(origin: string) {
    return {
        "Access-Control-Allow-Origin": APP_CONFIG.ALLOWED_ORIGINS.includes(origin as any)
            ? origin
            : APP_CONFIG.ALLOWED_ORIGINS[0], // Fallback or strict? Better strict.
        "Access-Control-Allow-Methods": "GET, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
    };
}

export async function OPTIONS(request: Request) {
    const origin = request.headers.get("origin") || "";
    return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Params are promises in Next.js 15
) {
    const origin = request.headers.get("origin") || "";
    const { id } = await params;

    // 1. Initialize Supabase
    const supabase = await createClient();

    // 2. Auth Check
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders(origin) }
        );
    }

    // 3. Subscription Check (as per plan)
    // OPTIONAL: Skip if "trialing" logic isn't strictly enforced right now. 
    // But plan says "Active / Trialing required".
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle(); // Use maybeSingle to avoid 406 if multiple rows (should be unique though)

    if (!subscription) {
        // Check if we want to be strict. The Plan says yes.
        return NextResponse.json(
            { error: "Subscription required (active or trialing)" },
            { status: 403, headers: corsHeaders(origin) }
        );
    }

    // 4. Fetch Project Metadata
    const { data: project, error: dbError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (dbError || !project) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404, headers: corsHeaders(origin) }
        );
    }

    // 5. Download File from Storage
    const { data: fileData, error: storageError } = await supabase.storage
        .from("user_projects")
        .download(project.storage_path);

    if (storageError) {
        return NextResponse.json(
            { error: "Failed to download project file" },
            { status: 500, headers: corsHeaders(origin) }
        );
    }

    // 6. Return JSON content
    const text = await fileData.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        return NextResponse.json(
            { error: "Invalid JSON in storage" },
            { status: 500, headers: corsHeaders(origin) }
        );
    }

    return NextResponse.json(json, { headers: corsHeaders(origin) });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const origin = request.headers.get("origin") || "";
    const { id } = await params;
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

    // Fetch first to get storage paths
    const { data: project } = await supabase
        .from("projects")
        .select("storage_path, thumbnail_path")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (!project) {
        return NextResponse.json(
            { error: "Not found" },
            { status: 404, headers: corsHeaders(origin) }
        );
    }

    // Delete from DB
    const { error: dbError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders(origin) });
    }

    // Delete from Storage
    const files = [project.storage_path];
    if (project.thumbnail_path) files.push(project.thumbnail_path);

    await supabase.storage.from("user_projects").remove(files);

    return NextResponse.json({ success: true }, { headers: corsHeaders(origin) });
}
