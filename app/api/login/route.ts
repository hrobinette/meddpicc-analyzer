import { NextResponse } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verify the submitted password and, if correct, set the session cookie.
export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    // No gate configured — nothing to sign into.
    return NextResponse.json({ ok: true });
  }

  let submitted = "";
  try {
    const body = await request.json();
    if (body && typeof body.password === "string") submitted = body.password;
  } catch {
    // fall through to the mismatch below
  }

  if (submitted !== password) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await authToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
