import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEDDPICC Analyzer",
  description: "Turn a sales call transcript into a MEDDPICC qualification summary.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-gray-50 to-gray-50">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-6">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm">
                M
              </span>
              <span className="font-semibold tracking-tight text-slate-900">
                MEDDPICC Analyzer
              </span>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
