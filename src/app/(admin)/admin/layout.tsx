import type { Metadata } from "next";
import "../../globals.css";

export const metadata: Metadata = {
  title: "ShifaIn — Homepage control panel",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface-muted">{children}</body>
    </html>
  );
}
