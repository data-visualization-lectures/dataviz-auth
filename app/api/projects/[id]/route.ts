import { proxyToApi } from "@/app/api/_lib/upstream-proxy";

function buildPath(id: string): string {
  return `/api/projects/${encodeURIComponent(id)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToApi(request, buildPath(id));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToApi(request, buildPath(id));
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToApi(request, buildPath(id));
}
