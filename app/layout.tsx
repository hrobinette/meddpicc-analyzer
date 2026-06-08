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
      <body>{children}</body>
    </html>
  );
}
