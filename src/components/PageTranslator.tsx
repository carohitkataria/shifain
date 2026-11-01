"use client";

import { useEffect } from "react";
import type { TranslatedLocale } from "@/lib/i18n";
import { MAX_BATCH, needsTranslation, sourceKey } from "@/lib/page-translation-rules";

/**
 * The page in a translated language (Arabic, French, …): the site renders its
 * English, and this swaps every piece of text — and placeholders, labels and
 * tooltips — for its translation. Translations come from this browser's copy
 * first, then from the server, which keeps one per sentence for everyone and
 * asks the AI only for sentences it has never seen.
 *
 * Only text nodes and attributes change, never the page's structure, so React
 * keeps working: when it writes new English into a node, the observer sees it
 * and translates that too. Anything inside translate="no" is left alone — the
 * chat's messages, the language menu, the patient's own entries.
 */
const ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"] as const;
const SKIP = 'script,style,noscript,code,pre,textarea,[translate="no"],[data-no-translate]';
const STORE_LIMIT = 4000;

type Shown = { source: string; shown: string };

export function PageTranslator({ locale }: { locale: TranslatedLocale }) {
  useEffect(() => {
    const storeKey = `shifain_tr_${locale}`;
    let known: Record<string, string> = {};
    try {
      known = JSON.parse(localStorage.getItem(storeKey) ?? "{}") as Record<string, string>;
    } catch {
      known = {};
    }
    const texts = new WeakMap<Text, Shown>();
    const attributes = new WeakMap<Element, Partial<Record<string, Shown>>>();
    const asked = new Set<string>();
    let timer: number | undefined;
    let stopped = false;

    const reveal = () => document.documentElement.removeAttribute("data-translating");

    /** Splits "  Book now " into its words and the spaces around them, which stay as they are. */
    const parts = (value: string) => {
      const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(value)!;
      return { before: match[1], core: match[2], after: match[3] };
    };

    /** Everything on the page still in English, with a way to put the translation in. */
    const collect = () => {
      const found: { source: string; apply: (text: string) => void }[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP)) continue;
        const current = node.data;
        if (texts.get(node)?.shown === current) continue;
        const { before, core, after } = parts(current);
        if (!needsTranslation(core, locale)) continue;
        const source = sourceKey(core);
        const target = node;
        found.push({
          source,
          apply: (text) => {
            const shown = `${before}${text}${after}`;
            texts.set(target, { source, shown });
            if (target.data !== shown) target.data = shown;
          },
        });
      }
      for (const element of document.body.querySelectorAll(ATTRIBUTES.map((name) => `[${name}]`).join(","))) {
        if (element.closest(SKIP)) continue;
        for (const name of ATTRIBUTES) {
          const current = element.getAttribute(name);
          if (!current || attributes.get(element)?.[name]?.shown === current) continue;
          if (!needsTranslation(current, locale)) continue;
          const source = sourceKey(current);
          found.push({
            source,
            apply: (text) => {
              attributes.set(element, { ...attributes.get(element), [name]: { source, shown: text } });
              if (element.getAttribute(name) !== text) element.setAttribute(name, text);
            },
          });
        }
      }
      return found;
    };

    const remember = () => {
      try {
        const entries = Object.entries(known);
        const kept = entries.length > STORE_LIMIT ? Object.fromEntries(entries.slice(-STORE_LIMIT)) : known;
        localStorage.setItem(storeKey, JSON.stringify(kept));
      } catch {
        /* a full or blocked store only means asking the server again */
      }
    };

    const pass = async () => {
      if (stopped) return;
      const found = collect();
      const waiting: typeof found = [];
      for (const item of found) {
        const text = known[item.source];
        if (text) item.apply(text);
        else waiting.push(item);
      }
      const unknown = [...new Set(waiting.map((item) => item.source))].filter((source) => !asked.has(source));
      if (unknown.length === 0) {
        reveal();
        return;
      }
      unknown.forEach((source) => asked.add(source));
      const batches: string[][] = [];
      for (let i = 0; i < unknown.length; i += MAX_BATCH) batches.push(unknown.slice(i, i + MAX_BATCH));
      // All at once: the server answers stored sentences straight away, and the page shows as soon as it can.
      await Promise.all(
        batches.map(async (batch) => {
          try {
            const res = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ locale, texts: batch, page: location.pathname }),
            });
            const data = (await res.json()) as { translations?: Record<string, string> };
            Object.assign(known, data.translations ?? {});
          } catch {
            /* the page keeps its English for these */
          }
          if (stopped) return;
          for (const item of waiting) {
            const text = known[item.source];
            if (text) item.apply(text);
          }
        }),
      );
      if (stopped) return;
      reveal();
      remember();
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void pass(), 200);
    };

    const translateTitle = () => {
      const title = document.title;
      const text = known[sourceKey(title)];
      if (text && title !== text) document.title = text;
    };

    void pass().then(translateTitle);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES] });
    // Never leave the page hidden, whatever happens to the network.
    const failsafe = window.setTimeout(reveal, 2500);
    return () => {
      stopped = true;
      observer.disconnect();
      window.clearTimeout(timer);
      window.clearTimeout(failsafe);
    };
  }, [locale]);

  return null;
}
