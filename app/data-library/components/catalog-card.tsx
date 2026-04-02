"use client";

import { FileSpreadsheet, Globe, Share2, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CatalogEntry } from "@/types/catalog";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  tabular: FileSpreadsheet,
  geographic: Globe,
  network: Share2,
  spec: Code,
};

const CATEGORY_LABEL_KEYS: Record<string, "dataLibrary.catTabular" | "dataLibrary.catGeographic" | "dataLibrary.catNetwork" | "dataLibrary.catSpec"> = {
  tabular: "dataLibrary.catTabular",
  geographic: "dataLibrary.catGeographic",
  network: "dataLibrary.catNetwork",
  spec: "dataLibrary.catSpec",
};

type CatalogCardProps = {
  entry: CatalogEntry;
  locale: Locale;
  onSelect: (entry: CatalogEntry) => void;
  onTagClick: (tag: string) => void;
};

export function CatalogCard({ entry, locale, onSelect, onTagClick }: CatalogCardProps) {
  const Icon = CATEGORY_ICONS[entry.category] || FileSpreadsheet;
  const name = locale === "ja" ? entry.name : entry.nameEn;
  const description = locale === "ja" ? entry.description : entry.descriptionEn;

  return (
    <div
      className="group relative flex flex-col border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer"
      onClick={() => onSelect(entry)}
    >
      <div className="relative aspect-video w-full bg-muted overflow-hidden flex items-center justify-center">
        {entry.thumbnailUrl ? (
          <img
            src={entry.thumbnailUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="h-12 w-12 text-muted-foreground/40" />
        )}
      </div>

      <div className="flex flex-col p-4 gap-2 flex-1">
        <h3 className="font-semibold truncate text-base">{name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge variant="secondary">{entry.format.toUpperCase()}</Badge>
          <Badge variant="outline">
            {t(locale, CATEGORY_LABEL_KEYS[entry.category] || "dataLibrary.catTabular")}
          </Badge>
        </div>

        {entry.rowCount > 0 && (
          <p className="text-xs text-muted-foreground mt-auto">
            {entry.rowCount.toLocaleString()} {t(locale, "dataLibrary.rows")}
            {entry.columns.length > 0 && (
              <> / {entry.columns.length} {t(locale, "dataLibrary.columns")}</>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-1">
          {entry.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
              className="text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CatalogCardSkeleton() {
  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-card animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="flex gap-1.5">
          <div className="h-5 bg-muted rounded w-12" />
          <div className="h-5 bg-muted rounded w-16" />
        </div>
      </div>
    </div>
  );
}
