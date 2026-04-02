"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { APP_CONFIG } from "@/lib/config";

const CATEGORIES = [
  { value: "tabular", labelKey: "dataLibrary.catTabular" as const },
  { value: "geographic", labelKey: "dataLibrary.catGeographic" as const },
  { value: "network", labelKey: "dataLibrary.catNetwork" as const },
  { value: "spec", labelKey: "dataLibrary.catSpec" as const },
];

type FilterBarProps = {
  locale: Locale;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  formatFilter: string;
  onFormatChange: (value: string) => void;
  toolFilter: string;
  onToolChange: (value: string) => void;
  activeTags: string[];
  onRemoveTag: (tag: string) => void;
  onClearAll: () => void;
  availableFormats: string[];
  availableTools: string[];
};

export function FilterBar({
  locale,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  formatFilter,
  onFormatChange,
  toolFilter,
  onToolChange,
  activeTags,
  onRemoveTag,
  onClearAll,
  availableFormats,
  availableTools,
}: FilterBarProps) {
  const hasActiveFilters =
    searchQuery ||
    categoryFilter !== "all" ||
    formatFilter !== "all" ||
    toolFilter !== "all" ||
    activeTags.length > 0;

  const toolDisplayName = (key: string) => {
    const url = APP_CONFIG.TOOL_URLS[key as keyof typeof APP_CONFIG.TOOL_URLS];
    if (!url) return key;
    try {
      return new URL(url).hostname.replace(".dataviz.jp", "");
    } catch {
      return key;
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm pb-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t(locale, "dataLibrary.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">{t(locale, "dataLibrary.allCategories")}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {t(locale, cat.labelKey)}
            </option>
          ))}
        </select>

        <select
          value={formatFilter}
          onChange={(e) => onFormatChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">{t(locale, "dataLibrary.allFormats")}</option>
          {availableFormats.map((fmt) => (
            <option key={fmt} value={fmt}>
              {fmt.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={toolFilter}
          onChange={(e) => onToolChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">{t(locale, "dataLibrary.allTools")}</option>
          {availableTools.map((tool) => (
            <option key={tool} value={tool}>
              {toolDisplayName(tool)}
            </option>
          ))}
        </select>
      </div>

      {(activeTags.length > 0 || hasActiveFilters) && (
        <div className="flex flex-wrap items-center gap-2">
          {activeTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => onRemoveTag(tag)}
            >
              {tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              {t(locale, "dataLibrary.clearFilters")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
