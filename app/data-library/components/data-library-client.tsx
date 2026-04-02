"use client";

import { useEffect, useMemo, useState } from "react";
import type { Catalog, CatalogEntry } from "@/types/catalog";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { FilterBar } from "./filter-bar";
import { CatalogCard, CatalogCardSkeleton } from "./catalog-card";
import { CatalogDetail } from "./catalog-detail";

type Props = {
  locale: Locale;
};

export function DataLibraryClient({ locale }: Props) {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);

  // Fetch catalog
  useEffect(() => {
    fetch("/catalog.json")
      .then((res) => res.json())
      .then((data: Catalog) => {
        setCatalog(data.entries);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Derive available formats and tools from the full catalog
  const availableFormats = useMemo(
    () => Array.from(new Set(catalog.map((e) => e.format))).sort(),
    [catalog]
  );

  const availableTools = useMemo(() => {
    const toolSet = new Set<string>();
    catalog.forEach((e) => e.compatibleTools.forEach((t) => toolSet.add(t)));
    return Array.from(toolSet).sort();
  }, [catalog]);

  // Filter
  const filtered = useMemo(() => {
    let result = catalog;

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.nameEn.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.descriptionEn.toLowerCase().includes(q) ||
          e.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }

    if (formatFilter !== "all") {
      result = result.filter((e) => e.format === formatFilter);
    }

    if (toolFilter !== "all") {
      result = result.filter((e) => e.compatibleTools.includes(toolFilter));
    }

    if (activeTags.length > 0) {
      result = result.filter((e) =>
        activeTags.every((tag) => e.tags.includes(tag))
      );
    }

    return result;
  }, [catalog, debouncedQuery, categoryFilter, formatFilter, toolFilter, activeTags]);

  const handleTagClick = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev : [...prev, tag]
    );
  };

  const handleRemoveTag = (tag: string) => {
    setActiveTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleClearAll = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setFormatFilter("all");
    setToolFilter("all");
    setActiveTags([]);
  };

  return (
    <div className="space-y-6">
      <FilterBar
        locale={locale}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        formatFilter={formatFilter}
        onFormatChange={setFormatFilter}
        toolFilter={toolFilter}
        onToolChange={setToolFilter}
        activeTags={activeTags}
        onRemoveTag={handleRemoveTag}
        onClearAll={handleClearAll}
        availableFormats={availableFormats}
        availableTools={availableTools}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CatalogCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground mb-4">
            {t(locale, "dataLibrary.noResults")}
          </p>
          <button
            onClick={handleClearAll}
            className="text-sm text-primary hover:underline"
          >
            {t(locale, "dataLibrary.clearFilters")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((entry) => (
            <CatalogCard
              key={entry.id}
              entry={entry}
              locale={locale}
              onSelect={setSelectedEntry}
              onTagClick={handleTagClick}
            />
          ))}
        </div>
      )}

      <CatalogDetail
        entry={selectedEntry}
        open={!!selectedEntry}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
        locale={locale}
      />
    </div>
  );
}
