import { htmlToMarkdown } from "@/lib/marketing/markdown";

function ensureAuthDebug(url: string): string {
  const parsed = new URL(url);
  if (!parsed.searchParams.has("auth_debug")) {
    parsed.searchParams.append("auth_debug", "");
  }
  return parsed.toString();
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (titleMatch?.[1] ?? "").replace(/\s+/g, " ").trim();
}

function extractMetaDescription(html: string): string {
  const metaMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i);
  return (metaMatch?.[1] ?? "").trim();
}

function extractMainHtml(html: string): string {
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) return articleMatch[0];
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
  if (mainMatch) return mainMatch[0];
  return html;
}

export async function importHugoFromUrl(url: string) {
  const targetUrl = ensureAuthDebug(url);
  const res = await fetch(targetUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "dataviz-marketing-importer/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`);
  }

  const html = await res.text();
  const title = extractTitle(html);
  const mainHtml = extractMainHtml(html);
  const markdown = htmlToMarkdown(mainHtml);

  return {
    title: title || url,
    markdown,
    sourceUrl: targetUrl,
  };
}

export async function resolveUrlCard(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "dataviz-marketing-importer/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`);
  }

  const html = await res.text();
  const title = extractTitle(html) || url;
  const description = extractMetaDescription(html);
  const cardMarkdown = [
    `### [${title}](${url})`,
    description ? `${description}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title,
    description,
    url,
    markdown: cardMarkdown,
  };
}
