"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Calendar, Link as LinkIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogEntry } from "@/types/catalog";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { APP_CONFIG } from "@/lib/config";
import { DataPreviewTable } from "./data-preview-table";

const CATEGORY_LABEL_KEYS: Record<string, "dataLibrary.catTabular" | "dataLibrary.catGeographic" | "dataLibrary.catNetwork" | "dataLibrary.catSpec"> = {
  tabular: "dataLibrary.catTabular",
  geographic: "dataLibrary.catGeographic",
  network: "dataLibrary.catNetwork",
  spec: "dataLibrary.catSpec",
};

type CatalogDetailProps = {
  entry: CatalogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
};

function toolDisplayName(key: string): string {
  const url = APP_CONFIG.TOOL_URLS[key as keyof typeof APP_CONFIG.TOOL_URLS];
  if (!url) return key;
  try {
    return new URL(url).hostname.replace(".dataviz.jp", "");
  } catch {
    return key;
  }
}

function buildToolUrl(toolKey: string, fileUrl: string): string {
  const baseUrl =
    APP_CONFIG.TOOL_URLS[toolKey as keyof typeof APP_CONFIG.TOOL_URLS];
  if (!baseUrl) return "#";
  return `${baseUrl}/?data_url=${encodeURIComponent(fileUrl)}`;
}

export function CatalogDetail({
  entry,
  open,
  onOpenChange,
  locale,
}: CatalogDetailProps) {
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(-1);

  // Reset variant selection when entry changes
  useEffect(() => {
    setSelectedVariantIdx(-1);
  }, [entry?.id]);

  if (!entry) return null;

  const name = locale === "ja" ? entry.name : entry.nameEn;
  const description = locale === "ja" ? entry.description : entry.descriptionEn;
  const hasVariants = entry.variants && entry.variants.length > 0;

  // Resolve file URL: variant selection takes priority
  let resolvedFileUrl: string;
  let displayRowCount = entry.rowCount;
  if (hasVariants && selectedVariantIdx >= 0) {
    const v = entry.variants![selectedVariantIdx];
    resolvedFileUrl =
      locale === "en" && v.fileUrlEn ? v.fileUrlEn : v.fileUrl;
    if (v.rowCount) displayRowCount = v.rowCount;
  } else {
    resolvedFileUrl =
      locale === "en" && entry.fileUrlEn ? entry.fileUrlEn : entry.fileUrl;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{name}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{entry.format.toUpperCase()}</Badge>
            <Badge variant="outline">
              {t(locale, CATEGORY_LABEL_KEYS[entry.category] || "dataLibrary.catTabular")}
            </Badge>
          </div>

          {/* Variant selector */}
          {hasVariants && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                {locale === "ja" ? "データを選択" : "Select data"}
              </h4>
              <select
                value={selectedVariantIdx}
                onChange={(e) => setSelectedVariantIdx(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={-1}>
                  {locale === "ja" ? "-- 選択してください --" : "-- Select --"}
                </option>
                {entry.variants!.map((v, i) => (
                  <option key={i} value={i}>
                    {locale === "ja" ? v.label : v.labelEn}
                    {v.rowCount ? ` (${v.rowCount}${locale === "ja" ? "行" : " rows"})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Meta */}
          {displayRowCount > 0 && (
            <div className="text-sm text-muted-foreground">
              {displayRowCount.toLocaleString()} {t(locale, "dataLibrary.rows")}
              {entry.columns.length > 0 && (
                <> / {entry.columns.length} {t(locale, "dataLibrary.columns")}</>
              )}
            </div>
          )}

          {/* Data vintage & source */}
          {(entry.dataAsOf || entry.sourceUrl) && (
            <div className="space-y-2 text-sm">
              {entry.dataAsOf && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    {t(locale, "dataLibrary.dataAsOf")}:
                  </span>
                  <span>{entry.dataAsOf}</span>
                </div>
              )}
              {entry.sourceUrl && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LinkIcon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    {t(locale, "dataLibrary.source")}:
                  </span>
                  <a
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {entry.sourceUrl.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Columns */}
          {entry.columns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                {t(locale, "dataLibrary.columns")}
              </h4>
              <div className="flex flex-wrap gap-1">
                {entry.columns.map((col) => (
                  <code
                    key={col}
                    className="text-xs px-1.5 py-0.5 rounded bg-muted"
                  >
                    {col}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag, i) => {
              const displayTag =
                locale === "en" ? entry.tagsEn?.[i] ?? tag : tag;
              return (
                <Badge key={tag} variant="outline" className="text-xs">
                  {displayTag}
                </Badge>
              );
            })}
          </div>

          {/* Data Preview — only show when variant is selected (or no variants) */}
          {(!hasVariants || selectedVariantIdx >= 0) && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                {t(locale, "dataLibrary.preview")}
              </h4>
              <DataPreviewTable
                fileUrl={resolvedFileUrl}
                format={entry.format}
                locale={locale}
              />
            </div>
          )}

          {/* Open With (1-to-many) */}
          <div>
            <h4 className="text-sm font-medium mb-3">
              {t(locale, "dataLibrary.openWith")}
            </h4>
            {hasVariants && selectedVariantIdx < 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "ja"
                  ? "上のドロップダウンからデータを選択してください"
                  : "Please select data from the dropdown above"}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {entry.compatibleTools.map((toolKey) => (
                  <Button
                    key={toolKey}
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={buildToolUrl(toolKey, resolvedFileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-1.5"
                    >
                      {toolDisplayName(toolKey)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
