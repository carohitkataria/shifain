"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { toUzCyrillic } from "@/lib/uz-cyrillic";

type Words = { title: string; lead: string; home: string; chat: string; retry: string };

/** English, Russian and Uzbek written here; Uzbek Cyrillic from the Uzbek; the AI-translated languages from the English. */
const WORDS: Record<"en" | "ru" | "uz", Record<"missing" | "broken", Words>> = {
  en: {
    missing: { title: "We couldn't find that page", lead: "The link may be old or mistyped. Your case and plan are safe — start again from the home page, or ask us in the chat.", home: "Go to the home page", chat: "Chat with us", retry: "Try again" },
    broken: { title: "Something went wrong on our side", lead: "Please try again in a moment. If it keeps happening, write to us in the chat — a coordinator will help.", home: "Go to the home page", chat: "Chat with us", retry: "Try again" },
  },
  ru: {
    missing: { title: "Такой страницы нет", lead: "Возможно, ссылка устарела или в ней опечатка. Ваша заявка и план в сохранности — начните с главной страницы или напишите нам в чат.", home: "На главную", chat: "Написать в чат", retry: "Попробовать снова" },
    broken: { title: "У нас что-то пошло не так", lead: "Попробуйте ещё раз через минуту. Если ошибка повторяется, напишите нам в чат — координатор поможет.", home: "На главную", chat: "Написать в чат", retry: "Попробовать снова" },
  },
  uz: {
    missing: { title: "Bunday sahifa topilmadi", lead: "Havola eskirgan yoki xato yozilgan bo'lishi mumkin. Arizangiz va rejangiz saqlangan — bosh sahifadan boshlang yoki chatda yozing.", home: "Bosh sahifaga", chat: "Chatda yozish", retry: "Qayta urinish" },
    broken: { title: "Bizda nimadir xato ketdi", lead: "Birozdan keyin qayta urinib ko'ring. Takrorlansa, chatda yozing — koordinator yordam beradi.", home: "Bosh sahifaga", chat: "Chatda yozish", retry: "Qayta urinish" },
  },
};

function wordsFor(locale: Locale, kind: "missing" | "broken"): Words {
  if (locale === "ru" || locale === "uz" || locale === "en") return WORDS[locale][kind];
  if (locale === "oz") {
    const uz = WORDS.uz[kind];
    return Object.fromEntries(Object.entries(uz).map(([key, value]) => [key, toUzCyrillic(value)])) as Words;
  }
  return WORDS.en[kind];
}

/** The page shown for a missing address or an unexpected error: the brand, a plain explanation and a way on. */
export function SiteProblem({ kind, onRetry }: { kind: "missing" | "broken"; onRetry?: () => void }) {
  const params = useParams<{ locale?: string }>();
  const locale: Locale = isLocale(params?.locale ?? "") ? (params!.locale as Locale) : DEFAULT_LOCALE;
  const words = wordsFor(locale, kind);
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-surface-muted px-4 py-16 text-center">
      <Link href={`/${locale}`} aria-label="Shifain" className="mb-10 inline-flex">
        <Logo />
      </Link>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet">{kind === "missing" ? "404" : "500"}</p>
      <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight text-navy sm:text-4xl">{words.title}</h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-slate">{words.lead}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button type="button" onClick={onRetry} className="inline-flex min-h-12 items-center rounded-full bg-violet px-6 font-semibold text-white transition hover:bg-brand-deep">
            {words.retry}
          </button>
        ) : null}
        <Link
          href={`/${locale}`}
          className={`inline-flex min-h-12 items-center rounded-full px-6 font-semibold transition ${onRetry ? "border border-line bg-white text-navy hover:border-violet" : "bg-violet text-white hover:bg-brand-deep"}`}
        >
          {words.home}
        </Link>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("shifain:open-chat"))}
          className="inline-flex min-h-12 items-center rounded-full border border-line bg-white px-6 font-semibold text-navy transition hover:border-violet"
        >
          {words.chat}
        </button>
      </div>
    </main>
  );
}
