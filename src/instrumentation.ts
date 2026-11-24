/**
 * Runs once when the server starts. Uploaded reports are kept for good, so a
 * database set up by an older version (which deleted them after thirty days)
 * has that rule taken away here, before anyone uploads anything.
 */
export async function register() {
  // Written as one `if` so the edge bundle drops the database code entirely.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
