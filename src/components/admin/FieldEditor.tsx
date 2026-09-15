import { LOCALES, LOCALE_META } from "@/lib/i18n";
import type { EditorNode } from "@/lib/editor";
import { AdminIcon } from "./AdminIcon";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

function Localized({ node }: { node: Extract<EditorNode, { kind: "localized" }> }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-4">
      <legend className="px-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
        {node.label}
      </legend>
      <div className="grid gap-3 lg:grid-cols-3">
        {LOCALES.map((locale) => (
          <label key={locale} className="block min-w-0">
            <span className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">
              {LOCALE_META[locale].english}
            </span>
            {node.multiline ? (
              <textarea
                name={`${node.path}.${locale}`}
                defaultValue={node.value[locale]}
                rows={4}
                className={inputClass}
              />
            ) : (
              <input name={`${node.path}.${locale}`} defaultValue={node.value[locale]} className={inputClass} />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * A repeatable list. Add and remove are submit buttons carrying an intent, so
 * the structural change and whatever the editor has typed are saved together —
 * nobody loses a half-written paragraph to an accidental "Add".
 */
function List({ node }: { node: Extract<EditorNode, { kind: "list" }> }) {
  return (
    <section className="rounded-xl2 border border-line bg-surface-muted p-4">
      <h3 className="mb-3 text-sm font-extrabold tracking-tight text-ink">{node.label}</h3>

      {node.items.length === 0 ? (
        <p className="mb-3 text-sm text-ink-soft">Nothing here yet.</p>
      ) : (
        <div className="space-y-4">
          {node.items.map((item, index) => (
            <div key={`${node.path}.${index}`} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <FieldEditor node={item} depth={2} />
              </div>
              <button
                type="submit"
                name="__intent"
                value={`remove:${node.path}:${index}`}
                aria-label={`Remove ${node.itemNoun} ${index + 1}`}
                title={`Remove this ${node.itemNoun}`}
                className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-red-50 hover:text-red-600"
              >
                <AdminIcon name="trash" className="h-[18px] w-[18px]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        name="__intent"
        value={`add:${node.path}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line bg-white px-3.5 py-2 text-sm font-semibold text-brand transition hover:border-brand hover:bg-brand-tint"
      >
        <AdminIcon name="plus" />
        Add {node.itemNoun}
      </button>
    </section>
  );
}

export function FieldEditor({ node, depth = 0 }: { node: EditorNode; depth?: number }) {
  if (node.kind === "group") {
    if (depth === 0) {
      return (
        <div className="space-y-5">
          {node.children.map((child, i) => (
            <FieldEditor key={`${child.kind}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      );
    }
    return (
      <section className="rounded-xl2 border border-line bg-surface-muted p-4">
        <h3 className="mb-3 text-sm font-extrabold tracking-tight text-ink">{node.label}</h3>
        <div className="space-y-4">
          {node.children.map((child, i) => (
            <FieldEditor key={`${child.kind}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      </section>
    );
  }

  if (node.kind === "list") return <List node={node} />;
  if (node.kind === "localized") return <Localized node={node} />;

  if (node.kind === "boolean") {
    return (
      <label className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3">
        <input type="checkbox" name={node.path} defaultChecked={node.value} className="h-4 w-4 accent-brand" />
        <span className="text-sm font-semibold text-ink">{node.label}</span>
      </label>
    );
  }

  return (
    <label className="block rounded-xl border border-line bg-white p-4">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
        {node.label}
      </span>
      {node.kind === "number" ? (
        <input type="number" name={node.path} defaultValue={node.value} className={inputClass} />
      ) : node.multiline ? (
        <textarea name={node.path} defaultValue={node.value} rows={3} className={inputClass} />
      ) : (
        <input name={node.path} defaultValue={node.value} className={inputClass} />
      )}
    </label>
  );
}
