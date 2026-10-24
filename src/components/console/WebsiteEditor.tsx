"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { GROUPS, type GroupKey } from "@/lib/admin-groups";
import { SECTION_IDS, SECTION_LABELS, type L, type SectionId, type SiteContent } from "@/lib/content-types";
import { buildEditor, isLocalized, type EditorNode } from "@/lib/editor";
import { discardDraftAction, publishAction, restoreDefaultsAction, saveDraftAction } from "@/app/(admin)/admin/website/actions";
import { CIcon } from "./CIcon";

type Lang = "en" | "ru" | "uz";
type Block = "header" | SectionId | "footer";
type Ctx = { content: SiteContent; lang: Lang; edit: boolean; set: (path: string, value: unknown) => void };

const LANGS: { key: Lang; short: string; name: string }[] = [
  { key: "en", short: "EN", name: "English" },
  { key: "ru", short: "RU", name: "Русский" },
  { key: "uz", short: "UZ", name: "Oʻzbekcha" },
];

/** Which content groups each block of the page edits. */
const BLOCK_GROUPS: Record<Block, GroupKey[]> = {
  header: ["brand", "contact", "nav"],
  footer: ["footer"],
  ...(Object.fromEntries(SECTION_IDS.map((id) => [id, [id]])) as Record<SectionId, GroupKey[]>),
};
const BLOCK_LABEL = (block: Block) => (block === "header" ? "Header, brand & contact" : block === "footer" ? "Footer" : SECTION_LABELS[block].replace(/ \(.*\)$/, ""));

// ---------------------------------------------------------------- paths

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function getIn(target: unknown, path: string): unknown {
  let node: unknown = target;
  for (const key of path.split(".")) {
    if (!isObject(node)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** A copy of the page with one value changed. */
function setIn<T>(target: T, path: string, value: unknown): T {
  const copy = structuredClone(target);
  const keys = path.split(".");
  let node = copy as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    if (!isObject(node[key])) return copy;
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
  return copy;
}

/** How many words differ from what is live: the editor's "unpublished changes". */
function countDiff(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (Array.isArray(a) && Array.isArray(b)) {
    let n = Math.abs(a.length - b.length);
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) n += countDiff(a[i], b[i]);
    return n;
  }
  if (isObject(a) && isObject(b)) {
    let n = 0;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (key === "version" || key === "updatedAt") continue;
      n += countDiff((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
    }
    return n;
  }
  return 1;
}

const tx = (value: unknown, lang: Lang): string => (typeof value === "string" ? value : isLocalized(value) ? value[lang] || value.en : "");

// ---------------------------------------------------------------- editable text

/** Text on the page that can be clicked and typed into, in the language being edited. */
function E({ ctx, path, as: Tag = "span", className = "" }: { ctx: Ctx; path: string; as?: "span" | "p" | "h1" | "h2" | "h3" | "b" | "em" | "small" | "div"; className?: string }) {
  const value = getIn(ctx.content, path);
  const localized = isLocalized(value);
  const fallback = localized && ctx.lang !== "en" && !(value as L)[ctx.lang];
  const text = tx(value, ctx.lang);
  // Empty optional text (a badge, an accent) stays off the page; the section's fields still hold it.
  if (!ctx.edit || !text) return text ? <Tag className={className}>{text}</Tag> : null;
  return (
    <>
      <Tag
        className={`${className} rounded outline-none ring-brand/40 hover:ring-2 focus:bg-white focus:ring-2 ${fallback ? "opacity-60" : ""}`}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onKeyDown={(event) => {
          if (event.key === "Enter" && Tag !== "p") {
            event.preventDefault();
            (event.target as HTMLElement).blur();
          }
        }}
        onBlur={(event) => {
          const next = (event.currentTarget.textContent ?? "").trim();
          const current = localized ? (value as L)[ctx.lang] : (value as string);
          if (next === (fallback ? (value as L).en : current) && fallback) return;
          if (next !== current) ctx.set(localized ? `${path}.${ctx.lang}` : path, next);
        }}
      >
        {text}
      </Tag>
      {fallback ? <span className="ml-1 rounded bg-saffron px-1 text-[9px] font-bold text-white align-middle">EN</span> : null}
    </>
  );
}

// ---------------------------------------------------------------- the page, section by section

const H2 = "text-[22px] font-extrabold leading-tight tracking-tight text-ink @3xl:text-[28px]";
const EYEBROW = "mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand";
const LEAD = "mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft";
const CARD = "rounded-2xl border border-line bg-white p-4";
const PAD = "px-5 py-8 @3xl:px-10 @3xl:py-12";

function Head({ ctx, group, eyebrow = "eyebrow", title = "title", body = "body" }: { ctx: Ctx; group: string; eyebrow?: string | null; title?: string; body?: string | null }) {
  return (
    <div className="mb-5">
      {eyebrow && getIn(ctx.content, `${group}.${eyebrow}`) !== undefined ? <E ctx={ctx} path={`${group}.${eyebrow}`} as="div" className={EYEBROW} /> : null}
      <E ctx={ctx} path={`${group}.${title}`} as="h2" className={H2} />
      {body && getIn(ctx.content, `${group}.${body}`) !== undefined ? <E ctx={ctx} path={`${group}.${body}`} as="p" className={LEAD} /> : null}
    </div>
  );
}

function Grid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  return <div className={`grid gap-3 ${cols === 4 ? "@xl:grid-cols-2 @4xl:grid-cols-4" : cols === 2 ? "@xl:grid-cols-2" : "@xl:grid-cols-2 @4xl:grid-cols-3"}`}>{children}</div>;
}

function Star({ ctx, group }: { ctx: Ctx; group: "usps" | "services" | "whyIndia" }) {
  const points = ctx.content[group].points;
  return (
    <div className={PAD}>
      <Head ctx={ctx} group={group} />
      <Grid>
        {points.map((point, index) => (
          <div key={point.id} className={CARD}>
            <span className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-brand-tint text-brand">
              <CIcon name="star" size={18} />
            </span>
            <E ctx={ctx} path={`${group}.points.${index}.title`} as="b" className="block text-[14px]" />
            <E ctx={ctx} path={`${group}.points.${index}.body`} as="p" className="mt-1 text-[12.5px] leading-relaxed text-ink-soft" />
          </div>
        ))}
      </Grid>
    </div>
  );
}

function Section({ block, ctx }: { block: Block; ctx: Ctx }) {
  const c = ctx.content;
  switch (block) {
    case "header":
      return (
        <div className="flex flex-wrap items-center gap-4 border-b border-line bg-white px-5 py-3.5 @3xl:px-10">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-[#9b7bf3] text-white">
              <CIcon name="cross" size={18} />
            </span>
            <div className="leading-tight">
              <E ctx={ctx} path="brand.name" as="b" className="block text-[17px] font-extrabold" />
              <E ctx={ctx} path="brand.wordmarkTagline" as="small" className="block text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted" />
            </div>
          </div>
          <nav className="hidden flex-1 flex-wrap justify-center gap-4 text-[13px] font-semibold text-ink-soft @3xl:flex">
            {(["treatments", "hospitals", "doctors", "costEstimate", "stories"] as const).map((key) => (
              <E key={key} ctx={ctx} path={`nav.${key}`} />
            ))}
          </nav>
          <span className="ml-auto inline-flex h-9 items-center rounded-full bg-brand px-4 text-[13px] font-bold text-white">
            <E ctx={ctx} path="nav.loginSignup" />
          </span>
        </div>
      );
    case "hero":
      return (
        <div className={`${PAD} grid gap-6 bg-gradient-to-br from-[#f3f6fe] to-[#eceef9] @4xl:grid-cols-[1.3fr_1fr]`}>
          <div>
            <E ctx={ctx} path="hero.eyebrow" as="div" className={EYEBROW} />
            <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-tight @3xl:text-[40px]">
              <E ctx={ctx} path="hero.headline" /> <E ctx={ctx} path="hero.headlineAccent" className="text-brand" />
            </h1>
            <E ctx={ctx} path="hero.body" as="p" className="mt-3 text-[14.5px] leading-relaxed text-ink-soft" />
            <div className="mt-5 flex flex-wrap gap-2.5">
              <span className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-[14px] font-bold text-white">
                <E ctx={ctx} path="hero.primaryCta" />
              </span>
              <span className="inline-flex h-11 items-center rounded-full border border-line bg-white px-5 text-[14px] font-bold">
                <E ctx={ctx} path="hero.secondaryCta" />
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {c.hero.badges.map((badge, index) => (
                <span key={badge.id} className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-soft shadow-sm">
                  <E ctx={ctx} path={`hero.badges.${index}.label`} />
                </span>
              ))}
            </div>
          </div>
          <div className="self-start rounded-2xl bg-white p-5 shadow-lg">
            <E ctx={ctx} path="hero.form.title" as="h3" className="text-[16px] font-extrabold" />
            {(["nameLabel", "phoneLabel", "countryLabel", "treatmentLabel"] as const).map((key) => (
              <div key={key} className="mt-3">
                <E ctx={ctx} path={`hero.form.${key}`} as="small" className="block text-[11px] font-bold text-ink-soft" />
                <div className="mt-1 h-9 rounded-lg border border-line bg-[#fafafd]" />
              </div>
            ))}
            <span className="mt-4 flex h-10 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
              <E ctx={ctx} path="hero.form.submit" />
            </span>
            <E ctx={ctx} path="hero.form.privacy" as="p" className="mt-2 text-[11px] text-ink-muted" />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 @4xl:col-span-2">
            {c.hero.values.map((value, index) => (
              <span key={value.id} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                <CIcon name="check" size={14} className="text-leaf" />
                <E ctx={ctx} path={`hero.values.${index}.label`} />
              </span>
            ))}
          </div>
        </div>
      );
    case "stats":
      return (
        <div className="grid grid-cols-2 gap-4 bg-white px-5 py-6 @3xl:grid-cols-4 @3xl:px-10">
          {c.stats.items.map((item, index) => (
            <div key={item.id}>
              <E ctx={ctx} path={`stats.items.${index}.value`} as="b" className="block text-[24px] font-extrabold text-brand" />
              <E ctx={ctx} path={`stats.items.${index}.label`} as="small" className="block text-[12px] text-ink-muted" />
            </div>
          ))}
        </div>
      );
    case "usps":
    case "services":
    case "whyIndia":
      return <Star ctx={ctx} group={block} />;
    case "journey":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="journey" />
          <Grid cols={4}>
            {c.journey.steps.map((step, index) => (
              <div key={step.id} className={CARD}>
                <span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-brand text-[12px] font-bold text-white">{index + 1}</span>
                <E ctx={ctx} path={`journey.steps.${index}.title`} as="b" className="block text-[14px]" />
                <E ctx={ctx} path={`journey.steps.${index}.body`} as="p" className="mt-1 text-[12.5px] leading-relaxed text-ink-soft" />
              </div>
            ))}
          </Grid>
          <E ctx={ctx} path="journey.footnote" as="p" className="mt-3 text-[12px] text-ink-muted" />
        </div>
      );
    case "specialties":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="specialties" />
          <Grid>
            {c.specialties.items.map((item, index) => (
              <div key={item.slug} className={CARD}>
                <E ctx={ctx} path={`specialties.items.${index}.title`} as="b" className="block text-[14px]" />
                <E ctx={ctx} path={`specialties.items.${index}.body`} as="p" className="mt-1 text-[12.5px] leading-relaxed text-ink-soft" />
                <E ctx={ctx} path="specialties.linkLabel" as="small" className="mt-2 block text-[12px] font-bold text-brand" />
              </div>
            ))}
          </Grid>
        </div>
      );
    case "aiPlanner":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="aiPlanner" />
          <div className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line p-4">
              <E ctx={ctx} path="aiPlanner.packageTitle" as="b" className="block" />
              <E ctx={ctx} path="aiPlanner.packageSubtitle" as="small" className="text-xs text-ink-muted" />
            </div>
            {c.aiPlanner.lines.map((line, index) => (
              <div key={line.id} className="flex items-center gap-3 border-b border-surface-muted px-4 py-2.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <E ctx={ctx} path={`aiPlanner.lines.${index}.title`} as="b" className="block text-[13.5px]" />
                  <E ctx={ctx} path={`aiPlanner.lines.${index}.note`} as="small" className="block text-xs text-ink-muted" />
                </div>
                <E ctx={ctx} path={`aiPlanner.lines.${index}.amount`} as="em" className="not-italic font-bold" />
              </div>
            ))}
            <div className="flex items-center justify-between p-4">
              <E ctx={ctx} path="aiPlanner.totalLabel" as="b" />
              <span className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-[13px] font-bold text-white">
                <E ctx={ctx} path="aiPlanner.cta" />
              </span>
            </div>
          </div>
          <E ctx={ctx} path="aiPlanner.disclaimer" as="p" className="mt-2 text-[11.5px] text-ink-muted" />
        </div>
      );
    case "upload":
      return (
        <div className={`${PAD} bg-[#0a1a47] text-white [&_.text-ink-soft]:text-white/75 [&_h2]:text-white`}>
          <Head ctx={ctx} group="upload" />
          <div className="rounded-2xl border border-dashed border-white/30 p-5 text-center">
            <E ctx={ctx} path="upload.dropTitle" as="b" className="block" />
            <E ctx={ctx} path="upload.dropNote" as="small" className="text-white/70" />
          </div>
        </div>
      );
    case "tracker":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="tracker" />
          <div className="flex flex-wrap gap-2">
            {c.tracker.steps.map((step, index) => (
              <span key={step.id} className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${step.state === "done" ? "bg-leaf-tint text-leaf" : step.state === "current" ? "bg-brand text-white" : "bg-white text-ink-soft ring-1 ring-line"}`}>
                <E ctx={ctx} path={`tracker.steps.${index}.label`} />
              </span>
            ))}
          </div>
        </div>
      );
    case "guarantee":
      return (
        <div className={`${PAD} grid gap-3 @3xl:grid-cols-2`}>
          {(["price", "translator"] as const).map((key) => (
            <div key={key} className={CARD}>
              <E ctx={ctx} path={`guarantee.${key}Badge`} as="small" className="mb-1 inline-block rounded-full bg-leaf-tint px-2 py-0.5 text-[11px] font-bold text-leaf" />
              <E ctx={ctx} path={`guarantee.${key}Title`} as="h3" className="text-[17px] font-extrabold" />
              <E ctx={ctx} path={`guarantee.${key}Body`} as="p" className="mt-1 text-[13px] leading-relaxed text-ink-soft" />
            </div>
          ))}
        </div>
      );
    case "costs":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="costs" />
          <Grid cols={4}>
            {c.costs.items.map((item, index) => (
              <div key={item.id} className={CARD}>
                <E ctx={ctx} path={`costs.items.${index}.title`} as="b" className="block text-[14px]" />
                <div className="mt-1 text-[12px] text-ink-muted">
                  <E ctx={ctx} path="costs.fromLabel" /> <E ctx={ctx} path={`costs.items.${index}.amount`} as="b" className="text-[18px] text-brand" />
                </div>
                <E ctx={ctx} path={`costs.items.${index}.note`} as="small" className="mt-1 block text-xs text-ink-muted" />
              </div>
            ))}
          </Grid>
          <E ctx={ctx} path="costs.footnote" as="p" className="mt-3 text-[12px] text-ink-muted" />
        </div>
      );
    case "hospitals":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="hospitals" />
          <Grid>
            {c.hospitals.items.map((item, index) => (
              <div key={item.id} className={CARD}>
                <E ctx={ctx} path={`hospitals.items.${index}.name`} as="b" className="block text-[14px]" />
                <E ctx={ctx} path={`hospitals.items.${index}.city`} as="small" className="block text-xs text-ink-muted" />
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.accreditations.map((tag) => (
                    <span key={tag} className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Grid>
          <p className="mt-2 text-[11.5px] text-ink-muted">On the live site, hospitals that have signed and been published in the catalogue are listed here.</p>
        </div>
      );
    case "doctors":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="doctors" />
          <Grid>
            {c.doctors.items.map((item, index) => (
              <div key={item.id} className={CARD}>
                <E ctx={ctx} path={`doctors.items.${index}.name`} as="b" className="block text-[14px]" />
                <E ctx={ctx} path={`doctors.items.${index}.speciality`} as="small" className="block text-xs text-ink-muted" />
                <E ctx={ctx} path={`doctors.items.${index}.highlight`} as="p" className="mt-1 text-[12.5px] text-ink-soft" />
              </div>
            ))}
          </Grid>
        </div>
      );
    case "comparison":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="comparison" />
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  <th className="p-3 text-left">
                    <E ctx={ctx} path="comparison.subject" />
                  </th>
                  {c.comparison.columns.map((_, index) => (
                    <th key={index} className="p-3 text-left">
                      <E ctx={ctx} path={`comparison.columns.${index}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.comparison.rows.map((row, index) => (
                  <tr key={row.id} className="border-t border-surface-muted">
                    <td className="p-3 font-bold">
                      <E ctx={ctx} path={`comparison.rows.${index}.label`} />
                    </td>
                    {row.values.map((_, col) => (
                      <td key={col} className="p-3">
                        <E ctx={ctx} path={`comparison.rows.${index}.values.${col}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "partners":
      return (
        <div className={`${PAD} grid gap-3 @3xl:grid-cols-2`}>
          {(["doctor", "hospital"] as const).map((who) => (
            <div key={who} className={CARD}>
              {who === "doctor" ? <E ctx={ctx} path="partners.eyebrow" as="div" className={EYEBROW} /> : null}
              <E ctx={ctx} path={`partners.${who}Title`} as="h3" className="text-[18px] font-extrabold" />
              <E ctx={ctx} path={`partners.${who}Body`} as="p" className="mt-1 text-[13px] text-ink-soft" />
              <ul className="mt-2 space-y-1">
                {c.partners[`${who}Points`].map((point, index) => (
                  <li key={point.id} className="flex items-center gap-1.5 text-[12.5px]">
                    <CIcon name="check" size={14} className="text-leaf" />
                    <E ctx={ctx} path={`partners.${who}Points.${index}.label`} />
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-[12.5px] font-bold text-white">
                  <E ctx={ctx} path={`partners.${who}Cta`} />
                </span>
                <span className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[12.5px] font-bold">
                  <E ctx={ctx} path={`partners.${who}Login`} />
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    case "stories":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="stories" />
          <Grid>
            {c.stories.items.map((item, index) => (
              <div key={item.id} className={`${CARD} ${item.verified === false ? "opacity-60" : ""}`}>
                <E ctx={ctx} path={`stories.items.${index}.quote`} as="p" className="text-[13.5px] italic leading-relaxed" />
                <div className="mt-2 text-[12px]">
                  <E ctx={ctx} path={`stories.items.${index}.name`} as="b" /> · <E ctx={ctx} path={`stories.items.${index}.treatment`} className="text-ink-muted" />
                </div>
                {item.verified === false ? <small className="mt-1 block text-[11px] font-bold text-saffron">Not shown until the patient agrees</small> : null}
              </div>
            ))}
          </Grid>
        </div>
      );
    case "faq":
      return (
        <div className={PAD}>
          <Head ctx={ctx} group="faq" />
          <div className="divide-y divide-line rounded-2xl border border-line bg-white">
            {c.faq.items.map((item, index) => (
              <details key={item.id} className="group px-4 py-3" open={ctx.edit && index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-bold">
                  <E ctx={ctx} path={`faq.items.${index}.question`} />
                  <span className="text-brand">+</span>
                </summary>
                <E ctx={ctx} path={`faq.items.${index}.answer`} as="p" className="mt-2 text-[13px] leading-relaxed text-ink-soft" />
              </details>
            ))}
          </div>
        </div>
      );
    case "closing":
      return (
        <div className={`${PAD} flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-brand to-[#9b7bf3] text-white`}>
          <div className="max-w-xl">
            <E ctx={ctx} path="closing.title" as="h2" className="text-[24px] font-extrabold" />
            <E ctx={ctx} path="closing.body" as="p" className="mt-1 text-[13.5px] text-white/85" />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-11 items-center rounded-full bg-white px-5 text-[14px] font-bold text-brand">
              <E ctx={ctx} path="closing.primaryCta" />
            </span>
            <span className="inline-flex h-11 items-center rounded-full border border-white/50 px-5 text-[14px] font-bold">
              <E ctx={ctx} path="closing.secondaryCta" />
            </span>
          </div>
        </div>
      );
    case "footer":
      return (
        <div className={`${PAD} grid gap-6 bg-[#0a1a47] text-white/80 @3xl:grid-cols-4`}>
          <div>
            <E ctx={ctx} path="brand.name" as="b" className="block text-[16px] text-white" />
            <E ctx={ctx} path="footer.about" as="p" className="mt-1.5 text-[12px] leading-relaxed" />
            <small className="mt-2 block text-[12px]">
              <E ctx={ctx} path="contact.phone" /> · <E ctx={ctx} path="contact.email" />
            </small>
          </div>
          {c.footer.columns.map((column, index) => (
            <div key={column.id}>
              <E ctx={ctx} path={`footer.columns.${index}.title`} as="b" className="block text-[13px] text-white" />
              {column.links.map((link, linkIndex) => (
                <E key={link.id} ctx={ctx} path={`footer.columns.${index}.links.${linkIndex}.label`} as="small" className="mt-1.5 block text-[12px]" />
              ))}
            </div>
          ))}
          <E ctx={ctx} path="footer.disclaimer" as="p" className="text-[11px] text-white/60 @3xl:col-span-4" />
          <E ctx={ctx} path="footer.copyright" as="small" className="text-[11px] text-white/60 @3xl:col-span-4" />
        </div>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------- the field drawer

function FieldNode({ node, ctx, depth = 0 }: { node: EditorNode; ctx: Ctx; depth?: number }) {
  const input = "mt-1 w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13.5px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand-tint";
  if (node.kind === "localized") {
    const value = getIn(ctx.content, node.path) as L;
    const Tag = node.multiline ? "textarea" : "input";
    return (
      <label className="mb-3 block text-[12px] font-bold text-ink-soft">
        {node.label}
        <Tag value={value?.[ctx.lang] ?? ""} placeholder={ctx.lang !== "en" ? value?.en : ""} onChange={(event) => ctx.set(`${node.path}.${ctx.lang}`, event.target.value)} className={`${input} ${node.multiline ? "min-h-[84px]" : ""}`} />
      </label>
    );
  }
  if (node.kind === "text") {
    const Tag = node.multiline ? "textarea" : "input";
    return (
      <label className="mb-3 block text-[12px] font-bold text-ink-soft">
        {node.label}
        <Tag value={String(getIn(ctx.content, node.path) ?? "")} onChange={(event) => ctx.set(node.path, event.target.value)} className={input} />
      </label>
    );
  }
  if (node.kind === "number") {
    return (
      <label className="mb-3 block text-[12px] font-bold text-ink-soft">
        {node.label}
        <input type="number" value={Number(getIn(ctx.content, node.path) ?? 0)} onChange={(event) => ctx.set(node.path, Number(event.target.value))} className={input} />
      </label>
    );
  }
  if (node.kind === "boolean") {
    return (
      <label className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
        <input type="checkbox" checked={Boolean(getIn(ctx.content, node.path))} onChange={(event) => ctx.set(node.path, event.target.checked)} className="h-4 w-4 accent-brand" />
        {node.label}
      </label>
    );
  }
  if (node.kind === "group") {
    return (
      <div className={depth ? "" : "mb-2"}>
        {node.children.map((child, index) => (
          <FieldNode key={"path" in child ? child.path : `${child.label}-${index}`} node={child} ctx={ctx} depth={depth + 1} />
        ))}
      </div>
    );
  }
  // A list: reorder, remove, add.
  const list = (getIn(ctx.content, node.path) as unknown[]) ?? [];
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    ctx.set(node.path, next);
  };
  const blank = (sample: unknown): unknown => {
    if (isLocalized(sample)) return { en: "", ru: "", uz: "" };
    if (Array.isArray(sample)) return sample.map(blank);
    if (isObject(sample)) return Object.fromEntries(Object.entries(sample).map(([key, value]) => [key, key === "id" || key === "slug" ? `x${Math.random().toString(36).slice(2, 9)}` : blank(value)]));
    if (typeof sample === "string") return "";
    return sample;
  };
  return (
    <div className="mb-4">
      <div className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
        {node.label} · {list.length}
      </div>
      {node.items.map((item, index) => (
        <div key={"path" in item ? item.path : index} className="mb-2.5 rounded-2xl border border-line bg-[#fafafd] p-3">
          <div className="mb-1 flex items-center gap-1">
            <span className="flex-1 truncate text-[12px] font-bold text-ink-soft">
              {index + 1}. {item.label}
            </span>
            <button type="button" onClick={() => move(index, index - 1)} aria-label="Move up" className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-white">
              <CIcon name="up" size={14} />
            </button>
            <button type="button" onClick={() => move(index, index + 1)} aria-label="Move down" className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-white">
              <CIcon name="down" size={14} />
            </button>
            <button type="button" onClick={() => ctx.set(node.path, list.filter((_, at) => at !== index))} aria-label="Remove" className="grid h-7 w-7 place-items-center rounded-lg text-red-500 hover:bg-white">
              <CIcon name="trash" size={14} />
            </button>
          </div>
          <FieldNode node={item} ctx={ctx} depth={depth + 1} />
        </div>
      ))}
      <button type="button" onClick={() => ctx.set(node.path, [...list, list.length ? blank(list[list.length - 1]) : ""])} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-brand/40 text-[12.5px] font-bold text-brand hover:bg-brand-tint">
        <CIcon name="plus" size={14} />
        Add {node.itemNoun}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- the editor

type Status = { kind: "idle" | "saving" | "saved" | "error" | "published"; text?: string };

export function WebsiteEditor({ initial, live: liveInitial, hasDraft, draftUpdatedAt }: { initial: SiteContent; live: SiteContent; hasDraft: boolean; draftUpdatedAt: string | null }) {
  const [content, setContent] = useState<SiteContent>(initial);
  const [live, setLive] = useState<SiteContent>(liveInitial);
  const [lang, setLang] = useState<Lang>("en");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [edit, setEdit] = useState(true);
  const [drawer, setDrawer] = useState<{ kind: "block"; block: Block } | { kind: "sections" } | null>(null);
  const [status, setStatus] = useState<Status>(hasDraft ? { kind: "saved", text: draftUpdatedAt ? `Draft from ${new Date(draftUpdatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Draft" } : { kind: "idle" });
  const [pending, startTransition] = useTransition();
  const touched = useRef(false);

  const set = useCallback((path: string, value: unknown) => {
    touched.current = true;
    setContent((current) => setIn(current, path, value));
  }, []);
  const ctx: Ctx = { content, lang, edit, set };
  const changes = useMemo(() => countDiff(content, live), [content, live]);

  // Save the draft a moment after the last change, so nothing typed is lost.
  useEffect(() => {
    if (!touched.current) return;
    setStatus({ kind: "saving" });
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await saveDraftAction(JSON.stringify(content));
        setStatus(result.ok ? { kind: "saved", text: "Draft saved" } : { kind: "error", text: result.error });
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const order = useMemo(() => [...SECTION_IDS].sort((a, b) => (content.sections[a]?.order ?? 0) - (content.sections[b]?.order ?? 0)), [content.sections]);
  const moveSection = (id: SectionId, step: number) => {
    const at = order.indexOf(id);
    const to = at + step;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[at], next[to]] = [next[to], next[at]];
    touched.current = true;
    setContent((current) => ({ ...structuredClone(current), sections: Object.fromEntries(next.map((key, index) => [key, { enabled: current.sections[key]?.enabled !== false, order: index }])) as SiteContent["sections"] }));
  };
  const toggleSection = (id: SectionId) => set(`sections.${id}.enabled`, content.sections[id]?.enabled === false);

  const publish = () =>
    startTransition(async () => {
      setStatus({ kind: "saving", text: "Publishing…" });
      const result = await publishAction(JSON.stringify(content));
      if (result.ok && result.content) {
        touched.current = false;
        setLive(result.content);
        setContent(result.content);
        setStatus({ kind: "published", text: "Published in English, Русский and Oʻzbekcha" });
        setDrawer(null);
      } else setStatus({ kind: "error", text: result.ok ? "Published" : result.error });
    });
  const discard = () => {
    if (!window.confirm("Discard every unpublished change and go back to the live page?")) return;
    startTransition(async () => {
      const result = await discardDraftAction();
      if (result.ok && result.content) {
        touched.current = false;
        setContent(result.content);
        setLive(result.content);
        setStatus({ kind: "idle" });
      }
    });
  };
  const restore = () => {
    if (!window.confirm("Put the homepage back to how it shipped? This publishes at once and cannot be undone.")) return;
    startTransition(async () => {
      const result = await restoreDefaultsAction();
      if (result.ok && result.content) {
        touched.current = false;
        setContent(result.content);
        setLive(result.content);
        setStatus({ kind: "published", text: "Back to the shipped homepage" });
        setDrawer(null);
      }
    });
  };

  const seg = (on: boolean) => `inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${on ? "bg-brand text-white" : "text-ink-muted hover:text-ink"}`;
  const blocks: Block[] = ["header", ...order, "footer"];

  const wrap = (block: Block) => {
    const id = block === "header" || block === "footer" ? null : block;
    const on = id ? content.sections[id]?.enabled !== false : true;
    if (!on && !edit) return null;
    return (
      <section key={block} className={`group/sec relative ${edit ? "outline-dashed outline-1 outline-transparent hover:outline-brand/50" : ""}`}>
        {edit ? (
          <div className="absolute right-2 top-2 z-10 hidden items-center gap-0.5 rounded-xl bg-ink/90 p-1 text-white shadow-lg group-hover/sec:flex group-focus-within/sec:flex" role="toolbar" aria-label={BLOCK_LABEL(block)}>
            <b className="px-2 text-[11.5px]">{BLOCK_LABEL(block)}</b>
            <button type="button" onClick={() => setDrawer({ kind: "block", block })} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11.5px] font-bold hover:bg-white/15">
              <CIcon name="pencil" size={13} />
              Edit
            </button>
            {id ? (
              <>
                <button type="button" onClick={() => moveSection(id, -1)} aria-label="Move up" className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/15">
                  <CIcon name="up" size={14} />
                </button>
                <button type="button" onClick={() => moveSection(id, 1)} aria-label="Move down" className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/15">
                  <CIcon name="down" size={14} />
                </button>
                <button type="button" onClick={() => toggleSection(id)} aria-label={on ? "Hide section" : "Show section"} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/15">
                  <CIcon name={on ? "eye-off" : "eye"} size={14} />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {on ? (
          <Section block={block} ctx={ctx} />
        ) : (
          <div className="flex items-center gap-2 border-y border-dashed border-line bg-[#fafafd] px-5 py-3 text-[12.5px] font-semibold text-ink-muted">
            <CIcon name="eye-off" size={15} />
            {BLOCK_LABEL(block)} is hidden
            <button type="button" onClick={() => id && toggleSection(id)} className="ml-2 rounded-lg bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand">
              Show
            </button>
          </div>
        )}
      </section>
    );
  };

  const drawerBlock = drawer?.kind === "block" ? drawer.block : null;
  const drawerId = drawerBlock && drawerBlock !== "header" && drawerBlock !== "footer" ? drawerBlock : null;

  return (
    <div>
      <div className="sticky top-[65px] z-20 -mx-4 mb-3 flex flex-wrap items-center gap-2.5 border-b border-line bg-[#f6f6fb]/95 px-4 py-2.5 backdrop-blur md:-mx-[30px] md:px-[30px]">
        <h2 className="mr-1 text-xl font-extrabold">Homepage</h2>
        <div className="inline-flex rounded-[11px] border border-line bg-white p-[3px]" role="group" aria-label="Language">
          {LANGS.map((item) => (
            <button key={item.key} type="button" onClick={() => setLang(item.key)} aria-pressed={lang === item.key} className={seg(lang === item.key)}>
              {item.short}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-[11px] border border-line bg-white p-[3px]" role="group" aria-label="Device">
          <button type="button" onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} className={seg(device === "desktop")}>
            <CIcon name="monitor" size={15} />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button type="button" onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} className={seg(device === "mobile")}>
            <CIcon name="phone-d" size={15} />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>
        <div className="inline-flex rounded-[11px] border border-line bg-white p-[3px]" role="group" aria-label="Mode">
          <button type="button" onClick={() => setEdit(true)} aria-pressed={edit} className={seg(edit)}>
            <CIcon name="pencil" size={15} />
            Edit
          </button>
          <button type="button" onClick={() => setEdit(false)} aria-pressed={!edit} className={seg(!edit)}>
            <CIcon name="eye" size={15} />
            Preview
          </button>
        </div>
        <span className="flex-1" />
        <span role="status" className={`rounded-full px-3 py-1.5 text-xs font-bold ${status.kind === "error" ? "bg-red-50 text-red-600" : changes ? "bg-saffron-tint text-[#b5650d]" : "bg-leaf-tint text-leaf"}`}>
          {status.kind === "error" ? status.text : status.kind === "saving" ? (status.text ?? "Saving draft…") : changes ? `${changes} unpublished change${changes === 1 ? "" : "s"}${status.text ? ` · ${status.text}` : ""}` : status.kind === "published" ? status.text : "All changes live"}
        </span>
        <button type="button" onClick={() => setDrawer({ kind: "sections" })} className="inline-flex h-10 items-center gap-1.5 rounded-[11px] border border-line bg-white px-3.5 text-[13px] font-bold hover:border-brand/30 hover:text-brand">
          <CIcon name="list" size={16} />
          <span className="hidden sm:inline">Sections</span>
        </button>
        <button type="button" onClick={discard} disabled={!changes || pending} aria-label="Discard unpublished changes" title="Discard unpublished changes" className="grid h-10 w-10 place-items-center rounded-[11px] border border-line bg-white text-ink-muted hover:text-brand disabled:opacity-40">
          <CIcon name="undo" size={16} />
        </button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="hidden h-10 items-center gap-1.5 rounded-[11px] border border-line bg-white px-3.5 text-[13px] font-bold hover:text-brand lg:inline-flex">
          <CIcon name="external" size={16} />
          Live
        </a>
        <button type="button" onClick={publish} disabled={!changes || pending} className="inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-deep disabled:opacity-50">
          <CIcon name="upload" size={16} />
          Publish
        </button>
      </div>

      {edit ? (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-brand-tint px-3.5 py-2.5 text-[13px] font-semibold text-ink">
          <CIcon name="pencil" size={16} className="text-brand" />
          <span>
            Click any text on the page to change it. Hover a section to edit all its fields, move or hide it.
            {lang !== "en" ? " EN marks text still showing in English." : ""} Changes save as a draft until you publish.
          </span>
        </div>
      ) : null}

      <div className={`@container mx-auto overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all ${device === "mobile" ? "max-w-[390px]" : "max-w-[1200px]"}`}>{blocks.map(wrap)}</div>

      {drawer ? (
        <>
          <button type="button" aria-label="Close" onClick={() => setDrawer(null)} className="fixed inset-0 z-[60] bg-[#1c1a36]/20" />
          <aside role="dialog" aria-modal="true" aria-label={drawer.kind === "sections" ? "Sections" : BLOCK_LABEL(drawer.block)} className="fixed inset-y-0 right-0 z-[70] flex w-full flex-col bg-white shadow-2xl md:w-[460px]">
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand-tint text-brand">
                <CIcon name={drawer.kind === "sections" ? "list" : "pencil"} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[17px] font-extrabold">{drawer.kind === "sections" ? "Sections" : BLOCK_LABEL(drawer.block)}</h3>
                <small className="text-xs text-ink-muted">{drawer.kind === "sections" ? "Order and visibility" : "Changes show on the page as you type"}</small>
              </div>
              <button type="button" onClick={() => setDrawer(null)} aria-label="Close" className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-ink-muted hover:bg-surface-muted">
                <CIcon name="x" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {drawer.kind === "sections" ? (
                <>
                  {(["header", ...order, "footer"] as Block[]).map((block, index) => {
                    const id = block === "header" || block === "footer" ? null : block;
                    const on = id ? content.sections[id]?.enabled !== false : true;
                    return (
                      <div key={block} className="flex items-center gap-2 border-b border-surface-muted py-2.5">
                        <span className="w-5 text-xs text-ink-muted">{id ? index : ""}</span>
                        <b className={`min-w-0 flex-1 truncate text-[13.5px] ${on ? "" : "text-ink-muted line-through"}`}>{BLOCK_LABEL(block)}</b>
                        {id ? (
                          <>
                            <button type="button" onClick={() => moveSection(id, -1)} aria-label={`Move ${BLOCK_LABEL(block)} up`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted">
                              <CIcon name="up" size={15} />
                            </button>
                            <button type="button" onClick={() => moveSection(id, 1)} aria-label={`Move ${BLOCK_LABEL(block)} down`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted">
                              <CIcon name="down" size={15} />
                            </button>
                            <button type="button" role="switch" aria-checked={on} aria-label={`Show ${BLOCK_LABEL(block)}`} onClick={() => toggleSection(id)} className={`relative h-6 w-10 rounded-full transition ${on ? "bg-brand" : "bg-line"}`}>
                              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
                            </button>
                          </>
                        ) : null}
                        <button type="button" onClick={() => setDrawer({ kind: "block", block })} aria-label={`Edit ${BLOCK_LABEL(block)}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted">
                          <CIcon name="pencil" size={15} />
                        </button>
                      </div>
                    );
                  })}
                  <div className="mt-6 rounded-2xl border border-line p-4">
                    <b className="block text-[13.5px]">Published version {live.version}</b>
                    <small className="block text-xs text-ink-muted">{live.version > 1 ? `Last published ${new Date(live.updatedAt).toLocaleString("en-GB")}` : "Showing the shipped homepage"}</small>
                    <button type="button" onClick={restore} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-3 text-[12.5px] font-bold text-red-600 hover:bg-red-50">
                      <CIcon name="undo" size={14} />
                      Restore the shipped homepage
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 inline-flex rounded-[11px] border border-line bg-white p-[3px]" role="group" aria-label="Language">
                    {LANGS.map((item) => (
                      <button key={item.key} type="button" onClick={() => setLang(item.key)} aria-pressed={lang === item.key} className={seg(lang === item.key)}>
                        {item.name}
                      </button>
                    ))}
                  </div>
                  {drawerId ? (
                    <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#fafafd] px-3.5 py-3">
                      <b className="text-[13.5px]">Show on homepage</b>
                      <button type="button" role="switch" aria-checked={content.sections[drawerId]?.enabled !== false} aria-label="Show section" onClick={() => toggleSection(drawerId)} className={`relative h-6 w-10 rounded-full transition ${content.sections[drawerId]?.enabled !== false ? "bg-brand" : "bg-line"}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${content.sections[drawerId]?.enabled !== false ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                  ) : null}
                  {BLOCK_GROUPS[drawer.block].map((group) => {
                    const node = buildEditor(content[group], GROUPS.find((item) => item.key === group)?.label ?? group, group);
                    return node ? (
                      <div key={group} className="mb-2">
                        {BLOCK_GROUPS[drawer.block].length > 1 ? <div className="mb-2 mt-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">{GROUPS.find((item) => item.key === group)?.label}</div> : null}
                        <FieldNode node={node} ctx={ctx} />
                      </div>
                    ) : null;
                  })}
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
              <button type="button" onClick={() => setDrawer(null)} className="inline-flex h-10 items-center rounded-[11px] border border-line px-4 text-[13px] font-bold">
                Done
              </button>
              <button type="button" onClick={publish} disabled={!changes || pending} className="inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-brand px-4 text-[13px] font-bold text-white disabled:opacity-50">
                <CIcon name="upload" size={16} />
                Publish
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
