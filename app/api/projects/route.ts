import { proxyToApi } from "@/app/api/_lib/upstream-proxy";

export async function GET(request: Request) {
  return proxyToApi(request, "/api/projects");
}

export async function POST(request: Request) {
  return proxyToApi(request, "/api/projects");
}
