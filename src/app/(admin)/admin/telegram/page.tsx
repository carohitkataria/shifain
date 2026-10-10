import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isTelegramConfigured } from "@/lib/telegram";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { TelegramSetup } from "@/components/admin/TelegramSetup";
import type { TelegramContact } from "@/lib/crm-messages";

export const dynamic = "force-dynamic";

export default async function TelegramPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const patientConfigured = isTelegramConfigured("patient");
  const partnerConfigured = isTelegramConfigured("partner");

  const contacts = await readOr<TelegramContact[]>([], (db) =>
    db
      .collection<TelegramContact>("telegram_contacts")
      .find({})
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray(),
  );

  const patientContacts = contacts.filter((c) => c.botRole === "patient");
  const partnerContacts = contacts.filter((c) => c.botRole === "partner");

  return (
    <AdminShell title="Telegram" subtitle="Bot configuration and connected users">
      {!isDatabaseConfigured() && <NotConfigured />}

      <div className="space-y-6">
        <Card
          title="Bot configuration"
          hint="Set TELEGRAM_BOT_TOKEN (or separate TELEGRAM_PATIENT_BOT_TOKEN / TELEGRAM_PARTNER_BOT_TOKEN) in your environment variables."
        >
          <TelegramSetup
            patientConfigured={patientConfigured}
            partnerConfigured={partnerConfigured}
          />
        </Card>

        <Card title="Patient bot users" hint="Users who have interacted with the patient bot.">
          {patientContacts.length === 0 ? (
            <p className="text-sm text-ink-soft">No patient contacts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wider text-ink-soft">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Username</th>
                    <th className="pb-2 pr-4">Phone</th>
                    <th className="pb-2 pr-4">Case</th>
                    <th className="pb-2 pr-4">State</th>
                    <th className="pb-2">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {patientContacts.map((c) => (
                    <tr key={c._id} className="border-b border-line/50">
                      <td className="py-2 pr-4 font-semibold text-ink">
                        {c.firstName} {c.lastName ?? ""}
                      </td>
                      <td className="py-2 pr-4 text-ink-soft">
                        {c.username ? `@${c.username}` : "—"}
                      </td>
                      <td className="py-2 pr-4 text-ink-soft">{c.phone ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {c.caseReference ? (
                          <a href={`/admin/cases`} className="font-semibold text-brand hover:underline">
                            {c.caseReference}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-soft">
                          {c.state}
                        </span>
                      </td>
                      <td className="py-2 text-ink-soft">
                        {new Date(c.updatedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {partnerContacts.length > 0 && (
          <Card title="Partner bot users">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wider text-ink-soft">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Username</th>
                    <th className="pb-2 pr-4">Phone</th>
                    <th className="pb-2">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerContacts.map((c) => (
                    <tr key={c._id} className="border-b border-line/50">
                      <td className="py-2 pr-4 font-semibold text-ink">
                        {c.firstName} {c.lastName ?? ""}
                      </td>
                      <td className="py-2 pr-4 text-ink-soft">
                        {c.username ? `@${c.username}` : "—"}
                      </td>
                      <td className="py-2 pr-4 text-ink-soft">{c.phone ?? "—"}</td>
                      <td className="py-2 text-ink-soft">
                        {new Date(c.updatedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
