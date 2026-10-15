import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { recentConversations, listMessages, type CrmMessage } from "@/lib/crm-messages";
import { findWebIntake, listWebChats, type WebChatSummary } from "@/lib/web-intake";
import { MessageInbox } from "@/components/admin/MessageInbox";
import { WebChatInbox } from "@/components/admin/WebChatInbox";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string; tab?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { chat, tab } = await searchParams;

  const webChats = await readOr<WebChatSummary[]>([], () => listWebChats(60));
  const waiting = webChats.filter((item) => item.humanRequestedAt && !item.handoff).length;
  const web = tab === "web";

  const tabs = (
    <nav className="mb-4 flex gap-1 rounded-xl bg-surface-muted p-1 sm:w-max" aria-label="Channels">
      {[
        { href: "/admin/messages", label: "Telegram", active: !web, badge: 0 },
        { href: "/admin/messages?tab=web", label: "Website & voice", active: web, badge: waiting },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
            item.active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
          }`}
        >
          {item.label}
          {item.badge ? (
            <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white" title="Asked for a person">
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  if (web) {
    const selected = chat ? (webChats.find((item) => item.id === chat) ?? null) : null;
    const intake = selected ? await readOr(null, () => findWebIntake(selected.id)) : null;
    return (
      <AdminShell title="Messages" subtitle="Conversations across all channels" fullWidth>
        {!isDatabaseConfigured() && <NotConfigured />}
        {tabs}
        <WebChatInbox chats={webChats} selected={selected} thread={intake?.messages ?? []} />
      </AdminShell>
    );
  }

  const conversations = await recentConversations(50);
  const selectedChat = chat ? Number(chat) : null;

  let thread: CrmMessage[] = [];
  if (selectedChat) {
    thread = await listMessages({ limit: 200 });
    thread = thread.filter((m) => m.telegramChatId === selectedChat).reverse();
  }

  return (
    <AdminShell title="Messages" subtitle="Conversations across all channels" fullWidth>
      {!isDatabaseConfigured() && <NotConfigured />}
      {tabs}
      <MessageInbox conversations={conversations} thread={thread} selectedChat={selectedChat} />
    </AdminShell>
  );
}
