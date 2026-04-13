const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dataviz.jp";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildUpstreamUrl(path: string, request: Request): URL {
  const incoming = new URL(request.url);
  const url = new URL(`${trimTrailingSlash(API_BASE)}${path}`);
  url.search = incoming.search;
  return url;
}

function buildForwardHeaders(request: Request): Headers {
  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  return headers;
}

export async function proxyToApi(request: Request, path: string): Promise<Response> {
  const method = request.method.toUpperCase();
  const headers = buildForwardHeaders(request);
  const upstreamUrl = buildUpstreamUrl(path, request);

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: new Headers(upstream.headers),
    });
  } catch (error) {
    return Response.json(
      { error: "upstream_unreachable", detail: String(error) },
      { status: 502 },
    );
  }
}
