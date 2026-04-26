"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getToolAccessForUser } from "@/lib/tool-access";

async function assertCanDelete(
    supabase: SupabaseClient,
    userId: string,
    accessToken?: string | null,
) {
    const toolAccess = await getToolAccessForUser({
        supabase,
        userId,
        accessToken,
    });

    if (!toolAccess.canUseTool) {
        throw new Error("Subscription required");
    }
}

export async function deleteProject(
    projectId: string,
    storagePath: string,
    thumbnailPath: string | null
) {
    const supabase = await createClient();

    try {
        // 1. Check authentication
        const [
            { data: { user } },
            { data: { session } },
        ] = await Promise.all([
            supabase.auth.getUser(),
            supabase.auth.getSession(),
        ]);

        if (!user) {
            throw new Error("Unauthorized");
        }

        await assertCanDelete(supabase, user.id, session?.access_token);

        // 2. Delete from Database first (to ensure consistency/permission via RLS)
        // The RLS policy "Users can delete own projects" ensures the user owns this record.
        const { error: dbError } = await supabase
            .from("projects")
            .delete()
            .eq("id", projectId)
            .eq("user_id", user.id); // Double check just in case

        if (dbError) {
            throw new Error(`Database deletion failed: ${dbError.message}`);
        }

        // 3. Delete files from Storage
        const filesToRemove = [storagePath];
        if (thumbnailPath) {
            filesToRemove.push(thumbnailPath);
        }

        const { error: storageError } = await supabase.storage
            .from("user_projects")
            .remove(filesToRemove);

        if (storageError) {
            console.error("Storage deletion failed:", storageError);
            // We don't throw here strictly because the DB record is already gone,
            // so the project is effectively deleted for the user.
            // We might want to log this for cleanup later.
        }

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Delete project error:", error);
        return { success: false, error: (error as Error).message };
    }
}

export async function deleteOpenRefineProject(
    projectId: string,
    archivePath: string
) {
    const supabase = await createClient();

    try {
        const [
            { data: { user } },
            { data: { session } },
        ] = await Promise.all([
            supabase.auth.getUser(),
            supabase.auth.getSession(),
        ]);

        if (!user) {
            throw new Error("Unauthorized");
        }

        await assertCanDelete(supabase, user.id, session?.access_token);

        const { error: dbError } = await supabase
            .from("openrefine_projects")
            .delete()
            .eq("id", projectId)
            .eq("user_id", user.id);

        if (dbError) {
            throw new Error(`Database deletion failed: ${dbError.message}`);
        }

        const { error: storageError } = await supabase.storage
            .from("openrefine-projects")
            .remove([archivePath]);

        if (storageError) {
            console.error("OpenRefine storage deletion failed:", storageError);
        }

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Delete OpenRefine project error:", error);
        return { success: false, error: (error as Error).message };
    }
}
