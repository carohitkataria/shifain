import { notFound, redirect } from "next/navigation";
import { AdminShell, Notice } from "@/components/admin/AdminShell";
import { FieldEditor } from "@/components/admin/FieldEditor";
import { isAuthenticated } from "@/lib/auth";
import { getContent } from "@/lib/store";
import { findGroup } from "@/lib/admin-groups";
import { buildEditor } from "@/lib/editor";
import { saveGroupAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const { group: key } = await params;
  const group = findGroup(key);
  if (!group) notFound();

  const content = await getContent();
  const editor = buildEditor(content[group.key], group.label, group.key);
  if (!editor) notFound();

  const { saved } = await searchParams;

  return (
    <AdminShell title={group.label} subtitle={group.hint} back={{ href: "/admin", label: "All sections" }}>
      {saved ? <Notice>Published. The homepage is live with your changes.</Notice> : null}

      <form action={saveGroupAction}>
        <input type="hidden" name="__group" value={group.key} />
        <FieldEditor node={editor} />

        <div className="sticky bottom-4 mt-8 flex justify-end">
          <button type="submit" className="btn btn-primary shadow-lg shadow-ink/20">
            Publish changes
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
