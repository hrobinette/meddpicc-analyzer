import { NextRequest, NextResponse } from "next/server";

// Simple password gate for the whole app (pages + API route).
//
// Protection turns ON only when APP_PASSWORD is set in the environment.
// - In Vercel: Project → Settings → Environment Variables → add APP_PASSWORD
//   (and optionally APP_USERNAME; defaults to "team"). Redeploy to apply.
// - If APP_PASSWORD is not set (e.g. local dev), the app stays open.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.next(); // Not configured → no gate.
  }

  const expectedUser = process.env.APP_USERNAME || "team";
  const header = req.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6)); // "user:pass"
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    if (user === expectedUser && pass === password) {
      return NextResponse.next();
    }
  }

  // Prompt the browser's native login dialog.
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="MEDDPICC Analyzer"' },
  });
}

// Run on everything except Next.js internals and static assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
