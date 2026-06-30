import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const workosMiddleware = authkitMiddleware({
  redirectUri: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ["/sign-in", "/auth/callback", "/api/healthz", "/api/readyz", "/api/ai/openai/oauth/callback"]
  }
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.CAREER_OS_AUTH_DISABLED === "true") return NextResponse.next();
  return workosMiddleware(request, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
