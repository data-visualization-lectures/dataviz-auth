"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.is_admin) throw new Error("Forbidden");
    return user;
}

export async function createGroup(name: string, maxSeats: number) {
    await requireAdmin();
    const adminDb = createAdminClient();

    const { data, error } = await adminDb
        .from("groups")
        .insert({ name, max_seats: maxSeats })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin");
    return { success: true, group: data };
}

export async function deleteGroup(groupId: string) {
    await requireAdmin();
    const adminDb = createAdminClient();

    const { error } = await adminDb
        .from("groups")
        .delete()
        .eq("id", groupId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin");
    return { success: true };
}

export async function addGroupMember(groupId: string, email: string, role: string = "member") {
    await requireAdmin();
    const adminDb = createAdminClient();

    // max_seats上限チェック
    const [{ data: group }, { count: memberCount }, { count: pendingCount }] = await Promise.all([
        adminDb.from("groups").select("max_seats").eq("id", groupId).single(),
        adminDb.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId),
        adminDb.from("group_invitations").select("*", { count: "exact", head: true }).eq("group_id", groupId).eq("status", "pending"),
    ]);

    const currentTotal = (memberCount ?? 0) + (pendingCount ?? 0);
    if (group && currentTotal >= group.max_seats) {
        return { success: false, error: `席数上限（${group.max_seats}名）に達しています` };
    }

    // auth.usersからメールアドレスでユーザー検索
    const { data: { users } } = await adminDb.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = users.find((u) => u.email === email);

    if (existingUser) {
        // 登録済みユーザー: group_membersに直接追加
        const { error } = await adminDb
            .from("group_members")
            .upsert(
                { group_id: groupId, user_id: existingUser.id, role },
                { onConflict: "group_id,user_id", ignoreDuplicates: true }
            );

        if (error) return { success: false, error: error.message };
    } else {
        // 未登録ユーザー: group_invitationsに追加 + 招待メール送信
        const { error: inviteDbError } = await adminDb
            .from("group_invitations")
            .upsert(
                { group_id: groupId, email, role, status: "pending" },
                { onConflict: "group_id,email", ignoreDuplicates: true }
            );

        if (inviteDbError) return { success: false, error: inviteDbError.message };

        // Supabase Auth の招待メール送信
        const { error: inviteError } = await adminDb.auth.admin.inviteUserByEmail(email);
        if (inviteError) {
            return { success: false, error: `招待メール送信失敗: ${inviteError.message}` };
        }
    }

    revalidatePath("/admin");
    return { success: true, isNewUser: !existingUser };
}

export async function removeGroupMember(groupId: string, userId: string) {
    await requireAdmin();
    const adminDb = createAdminClient();

    const { error } = await adminDb
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/admin");
    return { success: true };
}

export async function getGroups() {
    await requireAdmin();
    const adminDb = createAdminClient();

    const { data: groups } = await adminDb
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

    if (!groups) return [];

    // 各グループのメンバーと招待を取得
    const result = await Promise.all(
        groups.map(async (group) => {
            const [{ data: members }, { data: invitations }] = await Promise.all([
                adminDb
                    .from("group_members")
                    .select("user_id, role, created_at")
                    .eq("group_id", group.id),
                adminDb
                    .from("group_invitations")
                    .select("email, role, status, created_at")
                    .eq("group_id", group.id),
            ]);

            // メンバーのメール取得
            const memberUserIds = (members ?? []).map((m) => m.user_id);
            let memberEmails: Record<string, string> = {};
            if (memberUserIds.length > 0) {
                const { data: { users } } = await adminDb.auth.admin.listUsers({ perPage: 1000 });
                for (const u of users) {
                    if (memberUserIds.includes(u.id)) {
                        memberEmails[u.id] = u.email ?? "";
                    }
                }
            }

            return {
                ...group,
                members: (members ?? []).map((m) => ({
                    ...m,
                    email: memberEmails[m.user_id] ?? "",
                })),
                invitations: invitations ?? [],
            };
        })
    );

    return result;
}
