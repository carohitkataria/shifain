import type { Metadata, Viewport } from "next";
import "../../globals.css";

export const metadata: Metadata = {
  title: "ShifaIn — Coordinator desk",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#6c4fe0" };

/** The coordinator desk is its own small app: their patients, on a phone or a laptop. */
export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface-muted">{children}</body>
    </html>
  );
}
