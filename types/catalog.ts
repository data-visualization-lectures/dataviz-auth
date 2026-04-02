export type CatalogEntry = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  format: "csv" | "tsv" | "json" | "geojson" | "topojson" | "gexf" | "vega-spec";
  tags: string[];
  columns: string[];
  rowCount: number;
  fileUrl: string;
  thumbnailUrl: string | null;
  compatibleTools: string[];
  category: "tabular" | "geographic" | "network" | "spec";
};

export type Catalog = {
  version: number;
  updatedAt: string;
  entries: CatalogEntry[];
};
