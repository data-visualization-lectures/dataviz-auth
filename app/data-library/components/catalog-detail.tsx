"use client";

import { ExternalLink } from "lucide-react";
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
  if (!entry) return null;

  const name = locale === "ja" ? entry.name : entry.nameEn;
  const description = locale === "ja" ? entry.description : entry.descriptionEn;
  const fileUrl =
    locale === "en" && fileUrlEn ? fileUrlEn : fileUrl;

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

          {/* Meta */}
          {entry.rowCount > 0 && (
            <div className="text-sm text-muted-foreground">
              {entry.rowCount.toLocaleString()} {t(locale, "dataLibrary.rows")}
              {entry.columns.length > 0 && (
                <> / {entry.columns.length} {t(locale, "dataLibrary.columns")}</>
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
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Data Preview */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              {t(locale, "dataLibrary.preview")}
            </h4>
            <DataPreviewTable
              fileUrl={fileUrl}
              format={entry.format}
              locale={locale}
            />
          </div>

          {/* Open With (1-to-many) */}
          <div>
            <h4 className="text-sm font-medium mb-3">
              {t(locale, "dataLibrary.openWith")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {entry.compatibleTools.map((toolKey) => (
                <Button
                  key={toolKey}
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={buildToolUrl(toolKey, fileUrl)}
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
