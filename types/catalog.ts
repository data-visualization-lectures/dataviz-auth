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
  variants?: CatalogVariant[];
};

export type Catalog = {
  version: number;
  updatedAt: string;
  entries: CatalogEntry[];
};
