"use client";

import { useState } from "react";
import { Trash2, ExternalLink, Image as ImageIcon, Filter, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/app/actions";
import { APP_CONFIG } from "@/lib/config";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
    const [filterApp, setFilterApp] = useState<string>("all");

    // Extract unique app names for the filter dropdown
    const uniqueApps = Array.from(new Set(projects.map((p) => p.app_name))).sort();

    // Filter projects based on selection
    const filteredProjects = projects.filter(
        (p) => filterApp === "all" || p.app_name === filterApp
    );

    const getToolUrl = (appName: string, projectId: string) => {
        // @ts-ignore - Indexing strictly typed object with string
        const baseUrl = APP_CONFIG.TOOL_URLS[appName as keyof typeof APP_CONFIG.TOOL_URLS];
        if (!baseUrl) return "#";
        return `${baseUrl}/?project_id=${projectId}`;
    };

    const handleDelete = async (project: SavedProject) => {
        if (
            !confirm(
                `プロジェクト「${project.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`
            )
        ) {
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
        <div className="flex flex-col gap-6">
            {/* Search & Filter Bar */}
            <div className="flex justify-end items-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Filter className="w-4 h-4" />
                            {filterApp === "all" ? "すべてのツール" : filterApp}
                            <ChevronDown className="w-4 h-4 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setFilterApp("all")}>
                            <div className="flex items-center justify-between w-full gap-4">
                                <span>すべてのツール</span>
                                {filterApp === "all" && <Check className="w-4 h-4" />}
                            </div>
                        </DropdownMenuItem>
                        {uniqueApps.map((appName) => (
                            <DropdownMenuItem key={appName} onClick={() => setFilterApp(appName)}>
                                <div className="flex items-center justify-between w-full gap-4">
                                    <span>{appName}</span>
                                    {filterApp === appName && <Check className="w-4 h-4" />}
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/30 rounded-lg">
                        <p>条件に一致するプロジェクトはありません</p>
                    </div>
                ) : (
                    filteredProjects.map((project) => (
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
                    ))
                )}
            </div>
        </div>
    );
}
