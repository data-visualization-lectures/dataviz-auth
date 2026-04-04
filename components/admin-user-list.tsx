"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AdminUserRow } from "@/types/user";

type SortKey = keyof AdminUserRow;
type SortDir = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  active: "有料",
  trialing: "トライアル",
  canceled: "解約済",
  past_due: "支払い遅延",
  incomplete: "未完了",
  academia: "アカデミア",
  none: "なし",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  trialing: "bg-blue-100 text-blue-700 border-blue-200",
  canceled: "bg-red-100 text-red-700 border-red-200",
  past_due: "bg-amber-100 text-amber-700 border-amber-200",
  incomplete: "bg-gray-100 text-gray-600 border-gray-200",
  academia: "bg-purple-100 text-purple-700 border-purple-200",
  none: "bg-gray-100 text-gray-500 border-gray-200",
};

const PER_PAGE = 20;

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-muted-foreground/40">↕</span>;
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

export function AdminUserList({ data }: { data: AdminUserRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
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

    if (statusFilter !== "all") {
      rows = rows.filter(
        (r) => (r.subscriptionStatus ?? "none") === statusFilter,
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
      if (typeof av === "boolean" && typeof bv === "boolean") {
        return sortDir === "asc"
          ? Number(av) - Number(bv)
          : Number(bv) - Number(av);
      }
      return 0;
    });

    return rows;
  }, [data, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageRows = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(0);
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "email", label: "メール" },
    { key: "displayName", label: "表示名" },
    { key: "createdAt", label: "作成日" },
    { key: "subscriptionStatus", label: "ステータス" },
    { key: "planName", label: "プラン" },
    { key: "currentPeriodEnd", label: "有効期限" },
    { key: "lastSignInAt", label: "最終ログイン" },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          ユーザー一覧
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Input
            placeholder="メールまたは表示名で検索..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">すべてのステータス</option>
            <option value="active">有料</option>
            <option value="trialing">トライアル</option>
            <option value="academia">アカデミア</option>
            <option value="canceled">解約済</option>
            <option value="past_due">支払い遅延</option>
            <option value="incomplete">未完了</option>
            <option value="none">なし</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {filtered.length} / {data.length} 件
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
                    <SortIcon
                      active={sortKey === col.key}
                      dir={sortDir}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center py-8 text-muted-foreground"
                  >
                    該当するユーザーがいません
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const status = row.subscriptionStatus ?? "none";
                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-2 px-2 max-w-[200px] truncate">
                        {row.email}
                      </td>
                      <td className="py-2 px-2">
                        {row.displayName ?? "-"}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          className={STATUS_COLORS[status] ?? STATUS_COLORS.none}
                        >
                          {STATUS_LABELS[status] ?? status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        {row.planName ?? "-"}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        {formatDate(row.currentPeriodEnd)}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        {formatDate(row.lastSignInAt)}
                      </td>
                    </tr>
                  );
                })
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
