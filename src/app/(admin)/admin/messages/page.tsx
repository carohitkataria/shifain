import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { recentConversations, listMessages, type CrmMessage } from "@/lib/crm-messages";
import { MessageInbox } from "@/components/admin/MessageInbox";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { chat } = await searchParams;

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

      <MessageInbox conversations={conversations} thread={thread} selectedChat={selectedChat} />
    </AdminShell>
  );
}
