import { notFound, redirect } from "next/navigation";
import { AdminShell, Notice, SaveButton } from "@/components/admin/AdminShell";
import { FieldEditor } from "@/components/admin/FieldEditor";
import { isAuthenticated } from "@/lib/auth";
import { getContent } from "@/lib/store";
import { findGroup } from "@/lib/admin-groups";
import { buildEditor } from "@/lib/editor";
import { saveGroupAction } from "../actions";

export const dynamic = "force-dynamic";

const NOTICE: Record<string, string> = {
  "1": "Saved. The homepage is live with your changes.",
  added: "Added, and everything else on this page was saved with it.",
  removed: "Removed, and everything else on this page was saved with it.",
};

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
  const visible = group.section ? content.sections[group.section]?.enabled !== false : null;

  return (
    <AdminShell
      title={group.label}
      subtitle={group.hint}
      action={<SaveButton form="group-form">Save {group.label.toLowerCase()}</SaveButton>}
    >
      {saved ? <Notice>{NOTICE[saved] ?? NOTICE["1"]}</Notice> : null}

      <form id="group-form" action={saveGroupAction} className="space-y-5">
        <input type="hidden" name="__group" value={group.key} />

        {group.section ? (
          <section className="card p-6">
            <h2 className="font-extrabold text-ink">Section visibility</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Whether this section appears on the public homepage at all.
            </p>
            <label className="mt-4 flex items-center gap-2.5">
              <input
                type="checkbox"
                name="__visible"
                defaultChecked={visible ?? true}
                className="h-4 w-4 accent-brand"
              />
              <span className="text-sm font-semibold text-ink">Show {group.label.toLowerCase()}</span>
            </label>
          </section>
        ) : null}

        <FieldEditor node={editor} />

        <div className="flex justify-end pt-2">
          <SaveButton form="group-form">Save {group.label.toLowerCase()}</SaveButton>
        </div>
      </form>
    </AdminShell>
  );
}
