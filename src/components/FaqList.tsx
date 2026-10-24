import { t } from "@/lib/localize";
import type { Faq } from "@/lib/faqs";
import type { Locale } from "@/lib/i18n";

/** Questions as an accordion: the question is the button, the answer opens under it. */
export function FaqList({ items, locale }: { items: Faq[]; locale: Locale }) {
  return (
    <div className="divide-y divide-[#e6e3f4] border-y border-[#e6e3f4]">
      {items.map((item) => (
        <details key={item._id} id={item._id} className="group scroll-mt-24">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold text-navy sm:text-lg [&::-webkit-details-marker]:hidden">
            {t(item.question, locale)}
            <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-violet-soft text-lg text-violet transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="whitespace-pre-line pb-5 pr-2 text-base leading-relaxed text-[#2c3a5e] sm:pr-12">{t(item.answer, locale)}</p>
        </details>
      ))}
    </div>
  );
}
