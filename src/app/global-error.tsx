"use client";

import { useEffect } from "react";

/**
 * The last resort, when even the page frame failed to render. It replaces the
 * whole document, so it brings its own html and body and plain styles, and
 * says the one useful thing in the site's three hand-written languages.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[shifain] global error", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", background: "#f7f5fc", color: "#0a1a47" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px 16px" }}>
          <div style={{ maxWidth: 520, textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 28, margin: "0 0 12px", color: "#6d28d9" }}>shifain</p>
            <h1 style={{ fontSize: 24, margin: "0 0 12px" }}>Something went wrong on our side</h1>
            <p style={{ margin: "0 0 6px", lineHeight: 1.6 }}>Please try again in a moment. Your case and plan are safe.</p>
            <p style={{ margin: "0 0 6px", lineHeight: 1.6 }} lang="ru">У нас что-то пошло не так. Попробуйте ещё раз через минуту.</p>
            <p style={{ margin: "0 0 24px", lineHeight: 1.6 }} lang="uz">Bizda nimadir xato ketdi. Birozdan keyin qayta urinib ko&apos;ring.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={reset}
                style={{ minHeight: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#6d28d9", color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer" }}
              >
                Try again
              </button>
              {/* A full page load on purpose: the app's own navigation is what just failed. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" style={{ minHeight: 48, padding: "0 24px", borderRadius: 999, border: "1px solid #ddd6f3", background: "#fff", color: "#0a1a47", fontWeight: 600, fontSize: 16, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
                Home page
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
