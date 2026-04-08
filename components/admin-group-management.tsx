"use client";

import { useState, useTransition } from "react";
import { createGroup, deleteGroup, addGroupMember, removeGroupMember } from "@/app/admin/group-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, UserPlus, ChevronDown, ChevronRight, Mail, Clock } from "lucide-react";

type GroupMember = {
    user_id: string;
    role: string;
    email: string;
    created_at: string;
};

type GroupInvitation = {
    email: string;
    role: string;
    status: string;
    created_at: string;
};

type Group = {
    id: string;
    name: string;
    max_seats: number;
    stripe_subscription_id: string | null;
    created_at: string;
    members: GroupMember[];
    invitations: GroupInvitation[];
};

export function AdminGroupManagement({ groups: initialGroups }: { groups: Group[] }) {
    const [groups, setGroups] = useState(initialGroups);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupSeats, setNewGroupSeats] = useState(5);
    const [addMemberEmail, setAddMemberEmail] = useState<Record<string, string>>({});
    const [isPending, startTransition] = useTransition();

    const handleCreateGroup = () => {
        if (!newGroupName.trim()) return;
        startTransition(async () => {
            const result = await createGroup(newGroupName.trim(), newGroupSeats);
            if (result.success) {
                setNewGroupName("");
                setNewGroupSeats(5);
                setShowCreateForm(false);
                window.location.reload();
            } else {
                alert(result.error);
            }
        });
    };

    const handleDeleteGroup = (groupId: string, groupName: string) => {
        if (!confirm(`グループ「${groupName}」を削除しますか？メンバーとプロジェクトの紐付けも解除されます。`)) return;
        startTransition(async () => {
            const result = await deleteGroup(groupId);
            if (result.success) {
                window.location.reload();
            } else {
                alert(result.error);
            }
        });
    };

    const handleAddMember = (groupId: string) => {
        const email = addMemberEmail[groupId]?.trim();
        if (!email) return;
        startTransition(async () => {
            const result = await addGroupMember(groupId, email);
            if (result.success) {
                setAddMemberEmail((prev) => ({ ...prev, [groupId]: "" }));
                window.location.reload();
            } else {
                alert(result.error);
            }
        });
    };

    const handleRemoveMember = (groupId: string, userId: string, email: string) => {
        if (!confirm(`${email} をグループから削除しますか？`)) return;
        startTransition(async () => {
            const result = await removeGroupMember(groupId, userId);
            if (result.success) {
                window.location.reload();
            } else {
                alert(result.error);
            }
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">グループ管理</h3>
                <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
                    <Plus className="w-4 h-4 mr-1" />
                    グループ作成
                </Button>
            </div>

            {showCreateForm && (
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-sm font-medium">グループ名</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="例: 株式会社ABC"
                                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-sm font-medium">上限人数</label>
                                <input
                                    type="number"
                                    value={newGroupSeats}
                                    onChange={(e) => setNewGroupSeats(Number(e.target.value))}
                                    min={1}
                                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                            <Button onClick={handleCreateGroup} disabled={isPending}>
                                作成
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {groups.length === 0 ? (
                <p className="text-muted-foreground text-sm">グループはまだありません。</p>
            ) : (
                groups.map((group) => {
                    const isExpanded = expandedGroup === group.id;
                    const owner = group.members.find((m) => m.role === "owner");
                    const pendingInvites = group.invitations.filter((i) => i.status === "pending");

                    return (
                        <Card key={group.id}>
                            <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedGroup(isExpanded ? null : group.id)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        <CardTitle className="text-base">{group.name}</CardTitle>
                                        <span className="text-xs text-muted-foreground">
                                            ({group.members.length}/{group.max_seats}名)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {owner && <span>オーナー: {owner.email}</span>}
                                        <span>{new Date(group.created_at).toLocaleDateString("ja-JP")}</span>
                                    </div>
                                </div>
                            </CardHeader>

                            {isExpanded && (
                                <CardContent>
                                    <div className="flex flex-col gap-3">
                                        {/* Members */}
                                        <div className="text-sm font-medium">メンバー</div>
                                        <div className="flex flex-col gap-1">
                                            {group.members.map((member) => (
                                                <div key={member.user_id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{member.email}</span>
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                                                            {member.role === "owner" ? "オーナー" : "メンバー"}
                                                        </span>
                                                    </div>
                                                    {member.role !== "owner" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveMember(group.id, member.user_id, member.email)}
                                                            disabled={isPending}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pending Invitations */}
                                        {pendingInvites.length > 0 && (
                                            <>
                                                <div className="text-sm font-medium mt-2">招待中</div>
                                                <div className="flex flex-col gap-1">
                                                    {pendingInvites.map((invite) => (
                                                        <div key={invite.email} className="flex items-center gap-2 py-1.5 px-2 text-sm text-muted-foreground">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span>{invite.email}</span>
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">未登録</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {/* Add Member */}
                                        <div className="flex gap-2 mt-2">
                                            <input
                                                type="email"
                                                value={addMemberEmail[group.id] ?? ""}
                                                onChange={(e) => setAddMemberEmail((prev) => ({ ...prev, [group.id]: e.target.value }))}
                                                placeholder="メールアドレスを入力"
                                                className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                                                onKeyDown={(e) => e.key === "Enter" && handleAddMember(group.id)}
                                            />
                                            <Button size="sm" onClick={() => handleAddMember(group.id)} disabled={isPending}>
                                                <UserPlus className="w-4 h-4 mr-1" />
                                                追加
                                            </Button>
                                        </div>

                                        {/* Delete Group */}
                                        <div className="flex justify-end mt-2 pt-2 border-t">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteGroup(group.id, group.name)}
                                                disabled={isPending}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                グループ削除
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })
            )}
        </div>
    );
}
