export type CatalogVariant = {
  label: string;
  labelEn: string;
  fileUrl: string;
  fileUrlEn?: string | null;
  rowCount?: number;
};

export type CatalogEntry = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  format: "csv" | "tsv" | "json" | "geojson" | "topojson" | "gexf" | "graphml" | "vega-spec";
  tags: string[];
  columns: string[];
  rowCount: number;
  fileUrl: string;
  fileUrlEn: string | null;
  thumbnailUrl: string | null;
  compatibleTools: string[];
  category: "tabular" | "geographic" | "network" | "spec";
  // Free-form string describing the time period the data represents
  // (e.g. "2023年度", "令和5年", "2020年国勢調査", "2024年4月時点").
  // Display-only — not used for sorting.
  dataAsOf?: string | null;
  // Optional source URL for citation / verification.
  sourceUrl?: string | null;
  variants?: CatalogVariant[];
};

export type Catalog = {
  version: number;
  updatedAt: string;
  entries: CatalogEntry[];
};
