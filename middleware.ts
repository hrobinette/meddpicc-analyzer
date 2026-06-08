import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

// Password gate for the whole app, backed by a session cookie + branded /login.
//
// Protection turns ON only when APP_PASSWORD is set in the environment.
// - In Vercel: Project → Settings → Environment Variables → APP_PASSWORD.
// - If APP_PASSWORD is not set (e.g. local dev), the app stays open.
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.next(); // Not configured → no gate.
  }

  const { pathname } = req.nextUrl;

  // Always allow the login page and its endpoints.
  if (
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname === "/api/logout"
  ) {
    return NextResponse.next();
  }

  const expected = await authToken(password);
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token && token === expected) {
    return NextResponse.next();
  }

  // Not signed in: API calls get a clean 401, page loads go to the login screen.
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
