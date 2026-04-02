"use client";

import { FileSpreadsheet, Globe, Share2, Code, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CatalogEntry } from "@/types/catalog";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { APP_CONFIG } from "@/lib/config";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  tabular: FileSpreadsheet,
  geographic: Globe,
  network: Share2,
  spec: Code,
};

// d3.schemeTableau10 — フォーマット別に定性的カラーを割り当て
const FORMAT_COLORS: Record<string, string> = {
  csv: "#4e79a7",
  tsv: "#f28e2b",
  json: "#e15759",
  geojson: "#76b7b2",
  topojson: "#59a14f",
  gexf: "#edc948",
  graphml: "#b07aa1",
  "vega-spec": "#ff9da7",
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
      <div
        className="relative aspect-video w-full overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: FORMAT_COLORS[entry.format] ?? "#888" }}
      >
        {entry.thumbnailUrl ? (
          <img
            src={entry.thumbnailUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Icon className="h-10 w-10 text-white/80" />
            <span className="text-xs font-bold tracking-wider text-white/70 uppercase">
              {entry.format}
            </span>
          </div>
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

        {entry.compatibleTools.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-1">
            <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
            {entry.compatibleTools.map((toolKey) => {
              const url = APP_CONFIG.TOOL_URLS[toolKey as keyof typeof APP_CONFIG.TOOL_URLS];
              const label = url ? new URL(url).hostname.replace(".dataviz.jp", "") : toolKey;
              return (
                <span
                  key={toolKey}
                  className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                >
                  {label}
                </span>
              );
            })}
          </div>
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
