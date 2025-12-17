"use client";

import { useState } from "react";
import { Trash2, ExternalLink, FileJson, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";

// Since we checked package.json and didn't see date-fns, we'll write a simple formatter or just use toLocaleDateString
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export type SavedProject = {
    id: string;
    name: string;
    app_name: string;
    updated_at: string;
    storage_path: string;
    thumbnail_path: string | null;
    signedUrl: string | null;
};

export function SavedProjectsGrid({ projects }: { projects: SavedProject[] }) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const getToolUrl = (appName: string, projectId: string) => {
        // @ts-ignore - Indexing strictly typed object with string
        const baseUrl = APP_CONFIG.TOOL_URLS[appName as keyof typeof APP_CONFIG.TOOL_URLS];
        if (!baseUrl) return "#";
        return `${baseUrl}/?project_id=${projectId}`;
    };

    const handleDelete = async (project: SavedProject) => {
        if (!confirm(`プロジェクト「${project.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
            return;
        }

        setIsDeleting(project.id);
        try {
            const result = await deleteProject(
                project.id,
                project.storage_path,
                project.thumbnail_path
            );

            if (result.success) {
                toast.success("プロジェクトを削除しました");
            } else {
                toast.error(`削除に失敗しました: ${result.error}`);
            }
        } catch (e) {
            toast.error("エラーが発生しました");
        } finally {
            setIsDeleting(null);
        }
    };

    if (projects.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>保存されたプロジェクトはありません</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {projects.map((project) => (
                <div
                    key={project.id}
                    className="group relative flex flex-col border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm transition-all hover:shadow-md"
                >
                    {/* Thumbnail Area */}
                    <div className="relative aspect-video w-full bg-muted overflow-hidden flex items-center justify-center">
                        {project.signedUrl ? (
                            <img
                                src={project.signedUrl}
                                alt={project.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                                <ImageIcon className="w-12 h-12" />
                                <span className="text-xs">No Thumbnail</span>
                            </div>
                        )}

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>

                    {/* Content Area */}
                    <div className="flex flex-col p-4 gap-2 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold truncate text-lg" title={project.name}>
                                {project.name}
                            </h3>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary uppercase shrink-0">
                                {project.app_name}
                            </span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-auto">
                            更新: {formatDate(project.updated_at)}
                        </p>

                        <div className="flex gap-2 mt-4">
                            <a
                                href={getToolUrl(project.app_name, project.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                開く
                            </a>
                            <button
                                onClick={() => handleDelete(project)}
                                disabled={isDeleting === project.id}
                                className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20 transition-colors disabled:opacity-50"
                                title="削除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
