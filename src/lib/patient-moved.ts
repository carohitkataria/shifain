import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale } from "./i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * A page that became a tab of another screen. Its old address — in emails,
 * Telegram messages and bookmarks — still lands in the right place, with the
 * case and any note (?case=…&done=…) carried over.
 */
export function movedTo(screen: string, tab: string) {
  return async function Moved({ params, searchParams }: Props): Promise<never> {
    const { locale } = await params;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === "string" && key !== "tab") query.set(key, value);
    }
    query.set("tab", tab);
    redirect(`/${isLocale(locale) ? locale : DEFAULT_LOCALE}/portal/patient/${screen}?${query.toString()}`);
  };
}
