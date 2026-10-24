import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { CIcon } from "@/components/console/CIcon";
import { Empty, Note, Pill, Tabs, area, btn, field, label } from "@/components/console/ui";
import { isAuthenticated } from "@/lib/auth";
import { FAQ_CATEGORIES, listFaqs, type Faq, type FaqCategory } from "@/lib/faqs";
import { deleteFaqAction, saveFaqAction } from "./actions";

export const dynamic = "force-dynamic";

const LANGS = [
  { key: "en", name: "English" },
  { key: "ru", name: "Russian" },
  { key: "uz", name: "Uzbek (Latin — Cyrillic is made from it)" },
] as const;

function FaqForm({ item, category, nextOrder }: { item?: Faq; category: FaqCategory; nextOrder: number }) {
  return (
    <form action={saveFaqAction} className="grid gap-x-4 sm:grid-cols-3">
      {item ? <input type="hidden" name="id" value={item._id} /> : null}
      <label className={label}>
        Category
        <select name="category" defaultValue={item?.category ?? category} className={field}>
          {FAQ_CATEGORIES.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label.en}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Order on the page
        <input name="order" type="number" defaultValue={item?.order ?? nextOrder} className={field} />
      </label>
      <label className={label}>
        Status
        <select name="published" defaultValue={item?.published === false ? "off" : "on"} className={field}>
          <option value="on">Published</option>
          <option value="off">Hidden</option>
        </select>
      </label>
      {LANGS.map((lang) => (
        <div key={lang.key} className="sm:col-span-3">
          <label className={label}>
            Question · {lang.name}
            {lang.key === "en" ? " (required)" : ""}
            <input name={`q_${lang.key}`} required={lang.key === "en"} defaultValue={item?.question[lang.key] ?? ""} className={field} />
          </label>
          <label className={label}>
            Answer · {lang.name}
            <textarea name={`a_${lang.key}`} required={lang.key === "en"} defaultValue={item?.answer[lang.key] ?? ""} className={area} />
          </label>
        </div>
      ))}
      <label className={`${label} sm:col-span-3`}>
        Words patients use for this (comma separated) — helps the AI assistant find it
        <input name="keywords" defaultValue={item?.keywords.join(", ") ?? ""} placeholder="visa, medical visa, виза, viza" className={field} />
      </label>
      <div className="sm:col-span-3">
        <button className={btn.primary}>{item ? "Save" : "Add question"}</button>
      </div>
    </form>
  );
}

/** The FAQ: shown on the site's FAQ page, under Help in the patient app, and taught to the assistant. */
export default async function FaqsPage({ searchParams }: { searchParams: Promise<{ cat?: string; saved?: string; error?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const query = await searchParams;
  const all = await listFaqs({ publishedOnly: false });
  const category = (FAQ_CATEGORIES.find((item) => item.key === query.cat)?.key ?? "visa") as FaqCategory;
  const items = all.filter((faq) => faq.category === category);
  const nextOrder = (items.at(-1)?.order ?? 0) + 10;

  return (
    <AdminShell
      title="FAQs"
      subtitle="Shown on the FAQ page, in the patient app under Help, and used by the AI assistant"
      action={
        <details className="relative">
          <summary className={`${btn.primary} cursor-pointer list-none`}>
            <CIcon name="plus" size={16} />
            Add question
          </summary>
          <div className="absolute right-0 z-20 mt-2 max-h-[80vh] w-[min(92vw,720px)] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-xl">
            <FaqForm category={category} nextOrder={nextOrder} />
          </div>
        </details>
      }
    >
      {query.saved ? <div className="mb-4"><Note tone="green" icon="check">Saved — the site shows it within a minute.</Note></div> : null}
      {query.error ? <div className="mb-4"><Note tone="red" icon="alert">The English question and answer are required.</Note></div> : null}
      <Tabs items={FAQ_CATEGORIES.map((item) => ({ label: item.label.en, href: `/admin/faqs?cat=${item.key}`, on: item.key === category, muted: all.filter((faq) => faq.category === item.key).length }))} />

      {items.length === 0 ? <Empty>No questions here yet. Add the first one.</Empty> : null}
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <details key={item._id} className="group rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(30,32,50,.04),0_6px_20px_rgba(30,32,50,.05)]">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="w-8 flex-none text-xs font-bold text-ink-muted">{item.order}</span>
              <span className="min-w-0 flex-1">
                <b className="block text-[14px]">{item.question.en}</b>
                <small className="block truncate text-xs text-ink-muted">{item.question.ru || "No Russian yet"} · {item.question.uz || "No Uzbek yet"}</small>
              </span>
              <Pill tone={item.published ? "green" : "grey"}>{item.published ? "Published" : "Hidden"}</Pill>
              <CIcon name="down" size={16} />
            </summary>
            <div className="border-t border-line p-4">
              <FaqForm item={item} category={category} nextOrder={nextOrder} />
              <form action={deleteFaqAction} className="mt-3 flex justify-end">
                <input type="hidden" name="id" value={item._id} />
                <input type="hidden" name="category" value={item.category} />
                <button className={`${btn.danger} ${btn.sm}`}>Delete</button>
              </form>
            </div>
          </details>
        ))}
      </div>
    </AdminShell>
  );
}
