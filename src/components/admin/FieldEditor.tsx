import { LOCALES, LOCALE_META } from "@/lib/i18n";
import type { EditorNode } from "@/lib/editor";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

function Localized({ node }: { node: Extract<EditorNode, { kind: "localized" }> }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-4">
      <legend className="px-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">{node.label}</legend>
      <div className="grid gap-3 lg:grid-cols-3">
        {LOCALES.map((locale) => (
          <label key={locale} className="block">
            <span className="mb-1 block text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">
              {LOCALE_META[locale].english}
            </span>
            {node.multiline ? (
              <textarea name={`${node.path}.${locale}`} defaultValue={node.value[locale]} rows={4} className={inputClass} />
            ) : (
              <input name={`${node.path}.${locale}`} defaultValue={node.value[locale]} className={inputClass} />
            )}
          </label>
        ))}
      </div>
    </fieldset>
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

  if (node.kind === "localized") return <Localized node={node} />;

  if (node.kind === "boolean") {
    return (
      <label className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3">
        <input type="checkbox" name={node.path} defaultChecked={node.value} className="h-4 w-4 accent-[#0f5a91]" />
        <span className="text-sm font-semibold text-ink">{node.label}</span>
      </label>
    );
  }

  return (
    <label className="block rounded-xl border border-line bg-white p-4">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">{node.label}</span>
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
