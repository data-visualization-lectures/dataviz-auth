"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type DataPreviewTableProps = {
  fileUrl: string;
  format: string;
  locale: Locale;
};

function parseCsvRows(text: string, delimiter: string): string[][] {
  const lines = text.split("\n").filter((line) => line.trim());
  return lines.slice(0, 6).map((line) => line.split(delimiter));
}

export function DataPreviewTable({
  fileUrl,
  format,
  locale,
}: DataPreviewTableProps) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (format !== "csv" && format !== "tsv") {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch(fileUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.text();
      })
      .then((text) => {
        const delimiter = format === "tsv" ? "\t" : ",";
        setRows(parseCsvRows(text, delimiter));
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [fileUrl, format]);

  if (format !== "csv" && format !== "tsv") {
    return (
      <p className="text-sm text-muted-foreground italic">
        {locale === "ja"
          ? "このフォーマットのプレビューは対応していません。"
          : "Preview not available for this format."}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded w-full" />
        ))}
      </div>
    );
  }

  if (error || !rows || rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {locale === "ja"
          ? "プレビューを読み込めませんでした。"
          : "Could not load preview."}
      </p>
    );
  }

  const [header, ...dataRows] = rows;

  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted">
            {header.map((col, i) => (
              <th
                key={i}
                className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} className="border-t">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-2 py-1 whitespace-nowrap max-w-[200px] truncate"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
