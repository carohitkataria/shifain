import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, NotConfigured, Saved, Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { AssistantTester } from "@/components/admin/AssistantTester";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getAssistantConfig, type KnowledgeEntry } from "@/lib/assistant/config";
import { deleteEntryAction, saveEntryAction, saveInstructionsAction } from "./actions";

export const dynamic = "force-dynamic";

const FLOW = [
  { step: "1", title: "Commands", body: "“What's my case status”, “add visa support”, “sign me in” — done in code.", cost: "Free" },
  { step: "2", title: "Instant answers", body: "Knowledge entries you mark instant, given back word for word.", cost: "Free" },
  { step: "3", title: "AI conversation", body: "Everything else, following your instructions and using your knowledge.", cost: "Per message" },
  { step: "4", title: "A coordinator", body: "Reply from Messages and the AI steps aside until you hand back.", cost: "You" },
];

const EXAMPLES = `For example:
- Always mention that we have Russian- and Uzbek-speaking coordinators.
- If someone asks about cancer treatment, say our oncology partners review reports within 24 hours.
- Never recommend a specific hospital by name; the plan does that.
- Keep replies under two sentences on Telegram.`;

function EntryForm({ entry }: { entry?: KnowledgeEntry }) {
  return (
    <form action={saveEntryAction} className="grid gap-3">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <label>
        <span className={adminLabel}>Topic</span>
        <input name="title" defaultValue={entry?.title} placeholder="e.g. Payment and deposits" className={adminField} required />
      </label>
      <label>
        <span className={adminLabel}>When patients ask about…</span>
        <input
          name="keywords"
          defaultValue={entry?.keywords.join(", ")}
          placeholder="payment, pay, deposit, оплата, to'lov"
          className={adminField}
        />
        <span className="mt-1 block text-xs text-ink-soft">Words or short phrases, separated by commas, in any language.</span>
      </label>
      <label>
        <span className={adminLabel}>Answer (English)</span>
        <textarea name="answerEn" defaultValue={entry?.answer.en} rows={3} className={adminField} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={adminLabel}>Answer (Russian, optional)</span>
          <textarea name="answerRu" defaultValue={entry?.answer.ru} rows={3} className={adminField} />
        </label>
        <label>
          <span className={adminLabel}>Answer (Uzbek, optional)</span>
          <textarea name="answerUz" defaultValue={entry?.answer.uz} rows={3} className={adminField} />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="instant" defaultChecked={entry?.instant ?? false} className="h-4 w-4 accent-[color:var(--brand)]" />
          <span>
            <b>Answer instantly</b> — reply with exactly this, without the AI
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="enabled" defaultChecked={entry?.enabled ?? true} className="h-4 w-4 accent-[color:var(--brand)]" />
          <span>In use</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary !py-2 text-sm">
          {entry ? "Save" : "Add to knowledge"}
        </button>
        {entry ? (
          <button type="submit" formAction={deleteEntryAction} className="text-sm font-semibold text-red-700 hover:underline">
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved, error } = await searchParams;
  const config = await getAssistantConfig();

  return (
    <AdminShell title="AI assistant" subtitle="Teach the assistant that answers patients on the website, by voice and on Telegram" fullWidth>
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved what={saved === "deleted" ? "entry deleted" : undefined} /> : null}
      {error === "answer" ? <Warn>An entry needs an English answer.</Warn> : null}

      <ol className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FLOW.map((item) => (
          <li key={item.step} className="card flex gap-3 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-extrabold text-brand-deep">
              {item.step}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <b className="text-ink">{item.title}</b>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-soft">{item.cost}</span>
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{item.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-6">
          <Card title="Instructions" hint="Standing rules for every AI reply: tone, what to always mention, what never to say. The built-in safety rules (no diagnosis, no prices, emergencies) always apply.">
            <form action={saveInstructionsAction} className="space-y-3">
              <label htmlFor="instructions" className="sr-only">
                Instructions
              </label>
              <textarea
                id="instructions"
                name="instructions"
                defaultValue={config.instructions}
                rows={8}
                placeholder={EXAMPLES}
                className={`${adminField} font-mono text-[13px] leading-relaxed`}
              />
              <div className="flex items-center gap-3">
                <button type="submit" className="btn btn-primary !py-2 text-sm">
                  Save instructions
                </button>
                <span className="text-xs text-ink-soft">Takes effect within 30 seconds. Try it in the test chat.</span>
              </div>
            </form>
          </Card>

          <Card title={`Knowledge (${config.entries.length})`} hint="Facts the assistant can rely on. Every entry in use is given to the AI; entries marked instant are also answered directly, for free, when a short question matches their keywords.">
            <details className="mb-4 rounded-xl border border-dashed border-brand/40 p-4">
              <summary className="cursor-pointer font-bold text-brand">+ Add an entry</summary>
              <div className="mt-4">
                <EntryForm />
              </div>
            </details>

            {config.entries.length === 0 ? (
              <p className="text-sm text-ink-soft">No knowledge yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {config.entries.map((entry) => (
                  <li key={entry.id} className="py-3">
                    <details>
                      <summary className="flex cursor-pointer list-none items-start gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-ink">{entry.title}</span>
                          <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{entry.answer.en}</span>
                          {entry.keywords.length ? (
                            <span className="mt-1 block truncate text-xs text-ink-muted">{entry.keywords.join(" · ")}</span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          {entry.instant ? (
                            <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] font-bold text-leaf">Instant</span>
                          ) : null}
                          {!entry.enabled ? (
                            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-soft">Off</span>
                          ) : null}
                          {entry.answer.ru || entry.answer.uz ? (
                            <span className="text-[11px] font-semibold text-ink-muted">
                              EN{entry.answer.ru ? " · RU" : ""}
                              {entry.answer.uz ? " · UZ" : ""}
                            </span>
                          ) : null}
                        </span>
                      </summary>
                      <div className="mt-4 rounded-xl bg-surface-muted p-4">
                        <EntryForm entry={entry} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <AssistantTester />
        </div>
      </div>
    </AdminShell>
  );
}
