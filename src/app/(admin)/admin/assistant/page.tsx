import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, NotConfigured, Saved, Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { AssistantTester } from "@/components/admin/AssistantTester";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getAssistantConfig, type KnowledgeEntry } from "@/lib/assistant/config";
import { recentStats, topQuestions, type AnswerPath } from "@/lib/assistant/stats";
import { providerHealth } from "@/lib/ai/providers";
import { deleteEntryAction, dismissQuestionAction, saveEntryAction, saveInstructionsAction } from "./actions";

export const dynamic = "force-dynamic";

const FLOW = [
  { step: "1", title: "Commands", body: "“What's my case status”, “add visa support”, “sign me in” — done in code.", cost: "Free" },
  { step: "2", title: "Instant answers", body: "Knowledge entries you mark instant, given back word for word.", cost: "Free" },
  { step: "3", title: "AI conversation", body: "Everything else, following your instructions and using your knowledge.", cost: "Per message" },
  { step: "4", title: "A coordinator", body: "Reply from Messages and the AI steps aside until you hand back.", cost: "You" },
];

const PATH_LABEL: Record<AnswerPath, { label: string; bar: string }> = {
  command: { label: "Commands", bar: "bg-leaf" },
  instant: { label: "Instant answers", bar: "bg-emerald-400" },
  profile: { label: "Guided steps", bar: "bg-teal-400" },
  greeting: { label: "Welcomes", bar: "bg-sky-400" },
  handoff: { label: "Coordinator", bar: "bg-saffron" },
  scripted: { label: "No AI reachable", bar: "bg-red-400" },
  ai: { label: "AI", bar: "bg-brand" },
};

const EXAMPLES = `For example:
- Always mention that we have Russian- and Uzbek-speaking coordinators.
- If someone asks about cancer treatment, say our oncology partners review reports within 24 hours.
- Never recommend a specific hospital by name; the plan does that.
- Keep replies under two sentences on Telegram.`;

function EntryForm({
  entry,
  draft,
}: {
  entry?: KnowledgeEntry;
  /** Prefilled from a question patients asked, not yet saved. */
  draft?: { questionId: string; entry: KnowledgeEntry };
}) {
  const shown = entry ?? draft?.entry;
  return (
    <form action={saveEntryAction} className="grid gap-3">
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      {draft ? <input type="hidden" name="fromQuestion" value={draft.questionId} /> : null}
      <label>
        <span className={adminLabel}>Topic</span>
        <input name="title" defaultValue={shown?.title} placeholder="e.g. Payment and deposits" className={adminField} required />
      </label>
      <label>
        <span className={adminLabel}>When patients ask about…</span>
        <input
          name="keywords"
          defaultValue={shown?.keywords.join(", ")}
          placeholder="payment, pay, deposit, оплата, to'lov"
          className={adminField}
        />
        <span className="mt-1 block text-xs text-ink-soft">Words or short phrases, separated by commas, in any language.</span>
      </label>
      <label>
        <span className={adminLabel}>Answer (English)</span>
        <textarea name="answerEn" defaultValue={shown?.answer.en} rows={3} className={adminField} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className={adminLabel}>Answer (Russian, optional)</span>
          <textarea name="answerRu" defaultValue={shown?.answer.ru} rows={3} className={adminField} />
        </label>
        <label>
          <span className={adminLabel}>Answer (Uzbek, optional)</span>
          <textarea name="answerUz" defaultValue={shown?.answer.uz} rows={3} className={adminField} />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="instant" defaultChecked={shown?.instant ?? false} className="h-4 w-4 accent-[color:var(--brand)]" />
          <span>
            <b>Answer instantly</b> — reply with exactly this, without the AI
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="enabled" defaultChecked={shown?.enabled ?? true} className="h-4 w-4 accent-[color:var(--brand)]" />
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
  const [config, stats, questions] = await Promise.all([getAssistantConfig(), recentStats(7), topQuestions(12)]);
  const health = providerHealth();
  const free = stats.total - stats.byPath.ai;
  const freeShare = stats.total ? Math.round((free / stats.total) * 100) : null;

  return (
    <AdminShell title="AI assistant" subtitle="Teach the assistant that answers patients on the website, by voice and on Telegram" fullWidth>
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved what={saved === "deleted" ? "entry deleted" : undefined} /> : null}
      {error === "answer" ? <Warn>An entry needs an answer in at least one language.</Warn> : null}

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

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Last 7 days" hint="How each patient message was answered. Everything except “AI” is free.">
          {stats.total === 0 ? (
            <p className="text-sm text-ink-soft">No conversations yet.</p>
          ) : (
            <>
              <p className="text-3xl font-extrabold text-ink">
                {freeShare}% <span className="text-base font-semibold text-ink-soft">answered without AI</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {stats.total} messages · {stats.byPath.ai} used AI
                {stats.byPath.scripted ? ` · ${stats.byPath.scripted} when no AI was reachable` : ""}
              </p>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                {(Object.keys(PATH_LABEL) as AnswerPath[]).map((path) =>
                  stats.byPath[path] ? (
                    <span key={path} className={PATH_LABEL[path].bar} style={{ width: `${(stats.byPath[path] / stats.total) * 100}%` }} />
                  ) : null,
                )}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {(Object.keys(PATH_LABEL) as AnswerPath[]).map((path) => (
                  <li key={path} className="flex items-center gap-2 text-ink-soft">
                    <span className={`h-2.5 w-2.5 rounded-full ${PATH_LABEL[path].bar}`} aria-hidden="true" />
                    {PATH_LABEL[path].label}: <b className="text-ink">{stats.byPath[path]}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="AI health" hint="Live from this server since it last started. If Gemini shows errors, see the guide in the chat or Google AI Studio → Usage.">
          <ul className="space-y-3 text-sm">
            {(
              [
                ["Gemini", health.gemini],
                ["Claude", health.claude],
              ] as const
            ).map(([label, item]) => {
              const failing = item.lastErrorAt && (!item.lastOkAt || item.lastErrorAt > item.lastOkAt);
              const state = !item.configured
                ? { text: "Not set up", tone: "bg-surface-muted text-ink-soft" }
                : item.pausedUntil
                  ? { text: "Paused (quota or credit)", tone: "bg-saffron/15 text-saffron" }
                  : failing
                    ? { text: "Errors", tone: "bg-red-50 text-red-700" }
                    : item.lastOkAt
                      ? { text: "Working", tone: "bg-leaf/10 text-leaf" }
                      : { text: "Not used yet", tone: "bg-surface-muted text-ink-soft" };
              return (
                <li key={label} className="rounded-xl border border-line p-3">
                  <p className="flex items-center gap-2">
                    <b className="text-ink">{label}</b>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${state.tone}`}>{state.text}</span>
                  </p>
                  {item.lastOkAt ? (
                    <p className="mt-1 text-ink-soft">
                      Last answer {new Date(item.lastOkAt).toLocaleString("en-GB")} · {item.lastOkModel}
                    </p>
                  ) : null}
                  {item.lastError ? (
                    <p className="mt-1 break-words text-ink-soft">
                      Last error {item.lastErrorAt ? new Date(item.lastErrorAt).toLocaleString("en-GB") : ""} · {item.lastErrorModel}:{" "}
                      <span className="text-red-700">{item.lastError}</span>
                    </p>
                  ) : null}
                  {"chatPinned" in item && item.chatPinned ? (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
                      Chat model <b className="text-ink">{item.chatPinned}</b>
                      <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] font-bold text-leaf">Pinned</span>
                      <span className="text-xs text-ink-muted">GEMINI_CHAT_MODEL — always tried first</span>
                    </p>
                  ) : null}
                  {"chatOrder" in item && item.chatOrder.length ? (
                    <p className="mt-1 text-xs text-ink-muted">Chat tries, in order: {item.chatOrder.slice(0, 4).join(" → ")}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {questions.length > 0 ? (
        <div className="mb-6">
          <Card title="Questions the AI answered most" hint="Each of these cost an AI call every time. Turn the frequent ones into instant answers and they become free.">
            <ul className="divide-y divide-line">
              {questions.map((question) => (
                <li key={question._id} className="py-3">
                  <details>
                    <summary className="flex cursor-pointer list-none items-start gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{question.text}</span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">AI said: {question.lastReply}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand-deep">
                        ×{question.count}
                      </span>
                    </summary>
                    <div className="mt-4 rounded-xl bg-surface-muted p-4">
                      <p className="mb-3 text-sm text-ink-soft">Check the answer, add keywords, tick “Answer instantly”, and save.</p>
                      <EntryForm
                        draft={{
                          questionId: question._id,
                          entry: {
                            id: "",
                            title: question.text.replace(/\?$/, ""),
                            answer: question.lang === "en" ? { en: question.lastReply } : { en: "", [question.lang]: question.lastReply },
                            keywords: [],
                            instant: true,
                            enabled: true,
                          },
                        }}
                      />
                      <form action={dismissQuestionAction} className="mt-2">
                        <input type="hidden" name="id" value={question._id} />
                        <button type="submit" className="text-sm font-semibold text-ink-soft hover:underline">
                          Dismiss this question
                        </button>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

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
