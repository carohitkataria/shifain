import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { CIcon } from "@/components/console/CIcon";
import { Chip, Pill, type Tone } from "@/components/console/ui";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { TELEGRAM_FIRST } from "@/lib/journey-rules";

export const dynamic = "force-dynamic";

const set = (name: string) => Boolean(process.env[name]?.trim());

/** Every switch the business runs on, one card each, with where it is changed. */
export default async function SettingsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const [settings, counts] = await Promise.all([
    getSettings(),
    readOr({ coordinators: 0, partners: 0, hospitals: 0, doctors: 0, cases: 0 }, async (db) => ({
      coordinators: await db.collection("partner_users").countDocuments({ role: "coordinator" }),
      partners: await db.collection("partner_users").countDocuments({ role: { $ne: "coordinator" } }),
      hospitals: await db.collection("hospitals").countDocuments(),
      doctors: await db.collection("doctors").countDocuments(),
      cases: await db.collection("cases").countDocuments(),
    })),
  ]);
  const telegram = set("TELEGRAM_BOT_TOKEN") || set("TELEGRAM_PATIENT_BOT_TOKEN");
  const cards: { icon: string; tone: Tone; title: string; sub: string; href: string; state?: [string, Tone] }[] = [
    { icon: "users", tone: "brand", title: "Team & logins", sub: `${counts.coordinators} coordinator${counts.coordinators === 1 ? "" : "s"} · ${counts.partners} partner login${counts.partners === 1 ? "" : "s"}`, href: "/admin/access" },
    { icon: "wa", tone: "wa", title: "WhatsApp Business", sub: "Patients who choose WhatsApp are reached by phone until it is connected", href: "/admin/system/settings", state: ["Not connected", "grey"] },
    { icon: "tg", tone: "tg", title: "Telegram bot", sub: telegram ? "Patients and partners write to the bot; replies go out from the inbox" : "Add a bot token to start", href: "/admin/telegram", state: telegram ? ["Connected", "green"] : ["Not set", "amber"] },
    { icon: "mail", tone: "sky", title: "Email", sub: set("RESEND_API_KEY") ? `Sign-in codes and notices via Resend · ${process.env.MAIL_FROM || "no-reply@shifain.com"}` : "No mail key: email codes cannot be sent", href: "/admin/system/settings", state: set("RESEND_API_KEY") ? ["Sending", "green"] : ["Not set", "red"] },
    { icon: "sparkles", tone: "brand", title: "AI assistant", sub: `Planner ${settings.plannerEnabled ? "on" : "off"} · patient chat, voice and tests`, href: "/admin/assistant" },
    { icon: "file", tone: "amber", title: "Report storage", sub: `Files deleted after ${settings.reportRetentionDays} days`, href: "/admin/system/settings" },
    { icon: "globe", tone: "teal", title: "Languages", sub: "English, Русский and Oʻzbekcha on the site and in the app", href: "/admin/website" },
    { icon: "phone-d", tone: "rose", title: "Patient app", sub: `Telegram suggested first in ${[...TELEGRAM_FIRST].join(", ")}; WhatsApp elsewhere`, href: "/admin/system/settings" },
    { icon: "db", tone: "grey", title: "Database", sub: isDatabaseConfigured() ? `MongoDB · ${counts.hospitals} hospitals · ${counts.doctors} doctors · ${counts.cases} cases` : "MONGODB_URI is not set", href: "/admin/system/database", state: isDatabaseConfigured() ? undefined : ["Missing", "red"] },
  ];

  return (
    <ConsoleShell title="Settings" sub="How the console, the site and the patient app behave">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(30,32,50,.04),0_6px_20px_rgba(30,32,50,.05)] transition hover:-translate-y-0.5 hover:border-brand/30">
            <Chip icon={card.icon} tone={card.tone} />
            <div className="min-w-0 flex-1">
              <b className="flex items-center gap-2 text-[14px]">
                {card.title}
                {card.state ? <Pill tone={card.state[1]}>{card.state[0]}</Pill> : null}
              </b>
              <small className="mt-0.5 block text-xs leading-snug text-ink-muted">{card.sub}</small>
            </div>
            <CIcon name="chev-r" size={16} className="text-ink-muted" />
          </Link>
        ))}
      </div>
    </ConsoleShell>
  );
}
