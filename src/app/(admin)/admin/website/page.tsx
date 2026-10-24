import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { WebsiteEditor } from "@/components/console/WebsiteEditor";
import { NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getDraft } from "@/lib/store";

export const dynamic = "force-dynamic";

/** The homepage, editable where it stands: click a word to change it, publish when it reads right. */
export default async function WebsitePage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { content, live, hasDraft, draftUpdatedAt } = await getDraft();
  return (
    <ConsoleShell>
      {!isDatabaseConfigured() && <NotConfigured />}
      <WebsiteEditor initial={content} live={live} hasDraft={hasDraft} draftUpdatedAt={draftUpdatedAt} />
    </ConsoleShell>
  );
}
