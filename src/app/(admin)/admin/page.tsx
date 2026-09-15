import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell, Notice, SaveButton } from "@/components/admin/AdminShell";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { isAuthenticated } from "@/lib/auth";
import { getContent } from "@/lib/store";
import { GROUPS } from "@/lib/admin-groups";
import { SECTION_IDS, SECTION_LABELS } from "@/lib/content-types";
import { resetAction, saveSectionsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const content = await getContent();
  const { saved, reset } = await searchParams;

  const ordered = [...SECTION_IDS].sort(
    (a, b) => (content.sections[a]?.order ?? 0) - (content.sections[b]?.order ?? 0),
  );

  return (
    <AdminShell
      title="Homepage"
      subtitle="Choose what appears on the homepage and in what order. Changes go live when you click Save layout."
      action={<SaveButton form="layout-form">Save layout</SaveButton>}
    >
      {saved ? <Notice>Published. The homepage is live with your changes.</Notice> : null}
      {reset ? <Notice>Reset. The homepage is back to the shipped defaults.</Notice> : null}

      <form id="layout-form" action={saveSectionsAction} className="space-y-5">
        <section className="card p-6">
          <h2 className="font-extrabold text-ink">Section visibility</h2>
          <p className="mt-1 text-sm text-ink-soft">Show or hide each section of the homepage.</p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            {ordered.map((id) => (
              <label key={id} className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  name={`enabled.${id}`}
                  defaultChecked={content.sections[id]?.enabled !== false}
                  className="h-4 w-4 accent-brand"
                />
                <span className="text-sm font-semibold text-ink">{SECTION_LABELS[id]}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-extrabold text-ink">Order</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Lower numbers appear closer to the top of the page.
          </p>

          <ul className="mt-4 divide-y divide-line border-y border-line">
            {ordered.map((id) => (
              <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <span className="min-w-0 flex-1 basis-48 text-sm font-semibold text-ink">
                  {SECTION_LABELS[id]}
                </span>
                {content.sections[id]?.enabled === false ? (
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">
                    Hidden
                  </span>
                ) : null}
                <input
                  type="number"
                  name={`order.${id}`}
                  defaultValue={content.sections[id]?.order ?? 0}
                  aria-label={`Order for ${SECTION_LABELS[id]}`}
                  className="w-20 shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </li>
            ))}
          </ul>
        </section>

        <div className="flex justify-end pt-2">
          <SaveButton form="layout-form">Save layout</SaveButton>
        </div>
      </form>

      <section className="mt-10">
        <h2 className="text-xl font-extrabold tracking-tight text-ink">Content</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Every field is published in English, Russian and Uzbek. Blank translations fall back to English.
        </p>

        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <li key={group.key}>
              <Link href={`/admin/${group.key}`} className="card link-card flex h-full flex-col p-5">
                <span className="font-extrabold text-ink">{group.label}</span>
                <span className="mt-1 flex-1 text-sm text-ink-soft">{group.hint}</span>
                {group.section && content.sections[group.section]?.enabled === false ? (
                  <span className="mt-3 inline-flex w-fit rounded-full bg-surface-muted px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">
                    Hidden
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-10 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="min-w-0">
          <h2 className="font-extrabold text-ink">Published version {content.version}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Last published{" "}
            {content.version > 1 ? new Date(content.updatedAt).toUTCString() : "— showing shipped defaults"}
          </p>
        </div>
        <form action={resetAction}>
          <button type="submit" className="btn btn-secondary inline-flex items-center gap-2 !py-2.5 text-sm">
            <AdminIcon name="reset" />
            Reset to defaults
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
