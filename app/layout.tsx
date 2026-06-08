import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authToken } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEDDPICC Analyzer",
  description: "Turn a sales call transcript into a MEDDPICC qualification summary.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Show the Sign out link only when protection is on and the user is signed in.
  const password = process.env.APP_PASSWORD;
  let authed = false;
  if (password) {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    authed = !!token && token === (await authToken(password));
  }

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gradient-to-b from-blue-50/70 via-gray-50 to-gray-50">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
              <div className="flex items-center gap-2.5">
                <Logo />
                <span className="font-semibold tracking-tight text-slate-900">
                  MEDDPICC Analyzer
                </span>
              </div>
              {authed ? (
                <a
                  href="/api/logout"
                  className="ml-auto text-sm font-medium text-slate-500 transition hover:text-brand-blue"
                >
                  Sign out
                </a>
              ) : null}
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
