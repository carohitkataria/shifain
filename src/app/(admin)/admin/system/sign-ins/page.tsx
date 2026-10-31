import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { latestAudit, type AuditEntry } from "@/lib/audit";

export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = {
  password: "Password",
  "email-code": "Email code",
  "phone-code": "WhatsApp code",
  "case-code": "Case number + code",
  telegram: "Telegram",
  google: "Google",
  "chat-email-code": "Chat · email code",
  "chat-case-code": "Chat · case code",
};

const RESULT: Record<AuditEntry["result"], string> = {
  ok: "text-leaf",
  sent: "text-ink-soft",
  failed: "text-red-700",
  limited: "text-red-700",
  "needs-code": "text-saffron",
};

const methodLabel = (method: string) => METHOD[method] ?? (method.startsWith("action:") ? `Action · ${method.slice(7).replace(/[-_]/g, " ")}` : method);

/** Every patient sign-in attempt and every action that needed a verified patient, newest first. */
export default async function SignInLogPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const entries = isDatabaseConfigured() ? await latestAudit(50) : [];

  return (
    <AdminShell title="Sign-in log">
      {!isDatabaseConfigured() ? <NotConfigured /> : null}
      <Card
        title="The latest 50"
        hint="Patient sign-ins (password, codes, Telegram, Google, case number) and every action that needed a verified patient. No codes, passwords or medical details are kept. Lines are deleted after a year."
      >
        {entries.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">How</th>
                  <th className="py-2 pr-3">Case</th>
                  <th className="py-2 pr-3">Result</th>
                  <th className="py-2 pr-3">From</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-t border-line">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(entry.at).toISOString().replace("T", " ").slice(0, 19)} UTC</td>
                    <td className="py-2 pr-3">{methodLabel(entry.method)}</td>
                    <td className="py-2 pr-3 font-mono">{entry.reference ?? "—"}</td>
                    <td className={`py-2 pr-3 font-semibold ${RESULT[entry.result] ?? ""}`}>{entry.result}</td>
                    <td className="py-2 pr-3 text-ink-soft">{entry.session === "web" ? "Website" : "Chat"}{entry.ip ? ` · ${entry.ip}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  );
}
