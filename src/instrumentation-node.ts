import { ensureReportStorage } from "./lib/reports";

if (process.env.MONGODB_URI) {
  await ensureReportStorage().catch((error) => console.error("[shifain] report storage check failed at start-up", error));
}
