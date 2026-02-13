import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limiter
interface RateLimitStore {
  [key: string]: number[];
}

const rateLimitStore: RateLimitStore = {};

// Cleanup old entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  for (const key in rateLimitStore) {
    rateLimitStore[key] = rateLimitStore[key].filter(
      (timestamp) => timestamp > oneMinuteAgo
    );
    if (rateLimitStore[key].length === 0) {
      delete rateLimitStore[key];
    }
  }
}, 60000);

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

function isRateLimited(
  key: string,
  limit: number,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitStore[key]) {
    rateLimitStore[key] = [];
  }

  // Remove old entries outside the window
  rateLimitStore[key] = rateLimitStore[key].filter(
    (timestamp) => timestamp > windowStart
  );

  // Check if limit exceeded
  if (rateLimitStore[key].length >= limit) {
    return true;
  }

  // Add current request
  rateLimitStore[key].push(now);
  return false;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only rate limit API routes
  if (pathname.startsWith("/api")) {
    const clientIp = getClientIp(request);

    // Exclude status polling endpoints from rate limiting
    // These are called frequently during plan generation
    if (pathname.match(/\/api\/plans\/[^/]+\/status$/)) {
      return NextResponse.next();
    }

    // Auth routes: 10 requests per minute
    if (pathname.startsWith("/api/auth")) {
      const key = `auth:${clientIp}`;
      if (isRateLimited(key, 10)) {
        return NextResponse.json(
          { error: "Too many authentication requests. Please try again later." },
          { status: 429 }
        );
      }
    }
    // Other API routes: 30 requests per minute
    else {
      const key = `api:${clientIp}`;
      if (isRateLimited(key, 30)) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
