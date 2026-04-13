function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, "");
}

function escapeMarkdownText(input: string): string {
  return input.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function extractAttribute(tag: string, name: string): string | null {
  const quoted = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  if (quoted?.[1]) return quoted[1];

  const unquoted = tag.match(new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i"));
  return unquoted?.[1] ?? null;
}

function extractFirstSrcFromSrcset(srcset: string): string | null {
  const firstCandidate = srcset.split(",")[0]?.trim();
  if (!firstCandidate) return null;
  return firstCandidate.split(/\s+/)[0] ?? null;
}

function resolveToAbsoluteUrl(rawUrl: string, baseUrl?: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;

  if (/^(https?:|mailto:|tel:|data:|cid:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("#")) {
    return trimmed;
  }

  if (!baseUrl) {
    return trimmed;
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    const base = new URL(baseUrl);

    if (
      base.searchParams.has("auth_debug") &&
      resolved.origin === base.origin &&
      !resolved.searchParams.has("auth_debug")
    ) {
      resolved.searchParams.append("auth_debug", "");
    }

    return resolved.toString();
  } catch {
    return trimmed;
  }
}

function inlineMarkdownToHtml(input: string): string {
  const escaped = escapeHtml(input);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`);
      continue;
    }

    const image = line.match(/^!\[(.*?)\]\((.+)\)$/);
    if (image) {
      closeList();
      const alt = escapeHtml(image[1].trim());
      const src = escapeHtml(image[2].trim());
      out.push(
        `<p><img src="${src}" alt="${alt}" style="display:block;max-width:100%;height:auto;border:0;margin:12px 0;" /></p>`
      );
      continue;
    }

    const item = line.match(/^- (.+)$/);
    if (item) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inlineMarkdownToHtml(item[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  }

  closeList();
  return out.join("\n");
}

export function markdownToText(markdown: string): string {
  return markdown
    .replaceAll("\r\n", "\n")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "$1 ($2)")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .trim();
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function htmlToMarkdown(html: string, baseUrl?: string): string {
  const sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n\n")
    .replace(/<img\b[^>]*>/gi, (imgTag) => {
      const srcAttr = extractAttribute(imgTag, "src");
      const srcsetAttr = extractAttribute(imgTag, "srcset");
      const source = srcAttr ?? (srcsetAttr ? extractFirstSrcFromSrcset(srcsetAttr) : null);
      if (!source) return "";

      const resolvedUrl = resolveToAbsoluteUrl(decodeHtmlEntities(source), baseUrl);
      const altText = normalizeWhitespace(
        decodeHtmlEntities(extractAttribute(imgTag, "alt") ?? "")
      );

      return `\n\n![${escapeMarkdownText(altText)}](${resolvedUrl})\n\n`;
    })
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, body) => {
      const resolvedHref = resolveToAbsoluteUrl(decodeHtmlEntities(href), baseUrl);
      const linkText = normalizeWhitespace(decodeHtmlEntities(stripTags(body)));
      return linkText ? `[${escapeMarkdownText(linkText)}](${resolvedHref})` : resolvedHref;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/section>|<\/article>|<\/main>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(sanitized)
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}
