import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Removed Manual CORS headers. Middleware handles it now.

// LIST Projects
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const appName = searchParams.get("app");

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// CREATE Project
export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
            { status: 403 }
        );
    }

    try {
        const json = await request.json();
        const { name, app_name, data } = json;

        if (!name || !app_name || !data) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // 1. Generate UUID
        const uuid = crypto.randomUUID();

        // 2. Upload JSON to Storage
        const storagePath = `${user.id}/${uuid}.json`;
        const { error: uploadError } = await supabase.storage
            .from("user_projects")
            .upload(storagePath, JSON.stringify(data), {
                contentType: "application/json",
                upsert: true,
            });

        if (uploadError) throw uploadError;

        // 3. Insert DB
        const { error: dbError } = await supabase.from("projects").insert({
            id: uuid,
            user_id: user.id,
            name,
            app_name,
            storage_path: storagePath,
        });

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, id: uuid });
    } catch (e: any) {
        return NextResponse.json(
            { error: e.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
