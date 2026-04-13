import { proxyToApi } from "@/app/api/_lib/upstream-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToApi(request, `/api/projects/${encodeURIComponent(id)}/thumbnail`);
}
