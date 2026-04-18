"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ProjectRankingRow } from "@/types/user";

type SortKey = "email" | "displayName" | "projectCount" | "openrefineCount" | "totalCount";
type SortDir = "asc" | "desc";

const PER_PAGE = 20;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-muted-foreground/40">↕</span>;
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

function formatByApp(byApp: Record<string, number>): string {
  const entries = Object.entries(byApp).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "-";
  return entries.map(([k, v]) => `${k}:${v}`).join(", ");
}

export function AdminProjectRanking({ data }: { data: ProjectRankingRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let rows = data;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          (r.displayName ?? "").toLowerCase().includes(q),
      );
    }

    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return 0;
    });

    return rows;
  }, [data, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageRows = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "email" || key === "displayName" ? "asc" : "desc");
    }
    setPage(0);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "email", label: "メール" },
    { key: "displayName", label: "表示名" },
    { key: "projectCount", label: "projects" },
    { key: "openrefineCount", label: "openrefine" },
    { key: "totalCount", label: "合計" },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          ユーザー別プロジェクト数
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Input
            placeholder="メールまたは表示名で検索..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {filtered.length} / {data.length} 件（プロジェクト0件のユーザーは除外）
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left py-2 px-2 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground whitespace-nowrap"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </th>
                ))}
                <th className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">
                  アプリ別内訳
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="text-center py-8 text-muted-foreground"
                  >
                    該当するユーザーがいません
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-2 px-2 max-w-[200px] truncate">
                      {row.email}
                    </td>
                    <td className="py-2 px-2">{row.displayName ?? "-"}</td>
                    <td className="py-2 px-2 tabular-nums">{row.projectCount}</td>
                    <td className="py-2 px-2 tabular-nums">{row.openrefineCount}</td>
                    <td className="py-2 px-2 font-medium tabular-nums">{row.totalCount}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground max-w-[360px] truncate">
                      {formatByApp(row.byApp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border border-input hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <span className="text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded border border-input hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
