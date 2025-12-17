import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Removed Manual CORS headers. Middleware handles it now.

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // 1. Initialize Supabase
    const supabase = await createClient();

    // 2. Auth Check
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Subscription Check
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();

    if (!subscription) {
        return NextResponse.json(
            { error: "Subscription required (active or trialing)" },
            { status: 403 }
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
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 5. Download File from Storage
    const { data: fileData, error: storageError } = await supabase.storage
        .from("user_projects")
        .download(project.storage_path);

    if (storageError) {
        return NextResponse.json(
            { error: "Failed to download project file" },
            { status: 500 }
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
            { status: 500 }
        );
    }

    return NextResponse.json(json);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch first to get storage paths
    const { data: project } = await supabase
        .from("projects")
        .select("storage_path, thumbnail_path")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (!project) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete from DB
    const { error: dbError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Delete from Storage
    const files = [project.storage_path];
    if (project.thumbnail_path) files.push(project.thumbnail_path);

    await supabase.storage.from("user_projects").remove(files);

    return NextResponse.json({ success: true });
}
