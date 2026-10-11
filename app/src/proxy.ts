import type { NextRequest } from "next/server"
import { serveDevArtifactRequest } from "./lib/artifacts/dev-api"

export function proxy(request: NextRequest) {
  return serveDevArtifactRequest(request)
}

export const config = {
  matcher: [
    "/api/annotations/:path*",
    "/data/artifacts/:project/:slug/artifact.json",
    "/data/artifacts/:project/:slug/annotations.json",
    "/data/artifacts/:project/:slug/assets/:path*",
  ],
}
