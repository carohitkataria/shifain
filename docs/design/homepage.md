# Shifain homepage — audit, design system and plan

Shifain helps people from any country (Uzbekistan first) plan and travel for
treatment in India. The homepage has one job: get a worried patient or family
member to a free treatment plan, through the chat, the voice assistant or the
plan form. Everything on the page either builds trust for that step or gets
out of the way.

## 1. Audit of the page before this redesign

Measured with Playwright at 390 × 844 (phone) and 1440 × 900 (desktop).

| # | Problem | Evidence |
|---|---|---|
| 1 | The page is far too long | 19 sections; 22,388 px on a phone (≈ 26 screens), 15,054 px on desktop |
| 2 | The same promises repeat | "Instant plan, price guarantee, translator, visa & travel, accredited hospitals, follow-up" appear in five sections: Why Shifain, Your journey, Our promises, Case manager services, Why India |
| 3 | The process is explained three times | Journey (6 steps), sample tracker ("Case #SHIN-1042"), the upload band |
| 4 | Price is explained three times | Package builder demo ($6,150), indicative costs, comparison example |
| 5 | No single primary path | Nine different calls to action; the plan form sits straight under a hero that already offers chat, voice and sign-in |
| 6 | Demo content reads as real data | A "sample patient" tracker and a priced package that nobody asked for |
| 7 | Mobile hero is 1.7 screens tall | The badge wraps, three trust lines, the picture, then three slogan lines before any content |
| 8 | Two empty states back to back | Hospitals and Doctors each explain they list only signed partners — 1.4 phone screens saying "nothing yet" |
| 9 | Inconsistent components | Five button styles (violet, navy, tint, outline, white), card radii of 12, 16 and 24 px, icon tiles in violet, green and orange |
| 10 | Weak hierarchy | A small label above every heading, centred and left-aligned headings mixed, body text from 13 to 20 px |
| 11 | The floating "Need help?" pill covers content on phones | Overlaps form options and paragraphs while scrolling |

What works and stays: the hero (approved design), the chat and voice entry
points, the real plan form, treatment pages, the tie-up-only hospital and
doctor listings, the FAQ.

## 2. Design system (compact)

### Colour

| Token | Hex | Role |
|---|---|---|
| Ink | `#0A1A47` | Headings, body text, the one dark section |
| Violet | `#722BE4` | Primary actions, links, active states — nothing decorative |
| Violet wash | `#F4ECFF` | Icon tiles, selected states |
| Mist | `#F3F6FE` | Alternate section background (hero family) |
| Paper | `#FFFFFF` | Default background, cards |
| Slate | `#3F4A69` | Secondary text (≥ 7:1 on white) |

Leaf `#1F8A3B` is for success states only; saffron only for warnings.

### Type

One family, **Plus Jakarta Sans**, already the brand face. Sentence case
everywhere; no capital-letter labels; no label above every heading.

| Role | Phone | Desktop | Weight / leading |
|---|---|---|---|
| Display (hero) | 34 px | 64 px | 800 / 1.12 |
| Section heading | 28 px | 44 px | 800 / 1.1, balanced |
| Item heading | 18 px | 20 px | 700 / 1.3 |
| Lead | 17 px | 19 px | 400 / 1.55 |
| Body | 16 px | 16 px | 400 / 1.6 |
| Small | 14 px | 14 px | 500 / 1.5 — the minimum |

Line length ≤ 70 characters.

### Space, shape, layout

- 4 px base. Section padding 56 px (phone) / 96 px (desktop).
- One container, the same as the header and hero: up to 100 rem with 16 / 24 / 48 px gutters, so every section shares the hero's left edge. Text blocks cap at about 40 rem.
- Radius: controls are pills; cards 20 px; icon tiles 14 px. Rings, not shadows.
- Headings are left-aligned, except the closing form's heading.

### Buttons

| Kind | Look | Use |
|---|---|---|
| Primary | Violet fill, white text, pill, 48 px min height | One per section, the action that section exists for |
| Secondary | White, violet text, 1.5 px violet-tinted ring | A second, quieter choice |
| Text link | Violet, underline on hover | "See all treatments" and similar |

All have a visible focus ring (2 px violet, 2 px offset) and ≥ 44 px targets.

### Navigation

- Sticky header: 64 px (phone) / 76 px (desktop). Logo, six links, language, "Login / Sign up".
- Phone: logo, language, menu. The floating help button becomes a 56 px circle (icon only, labelled) so it never covers a line of text.

### Breakpoints

Mobile first: base < 640, `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
Every section is designed at 390 px first, then widened.

## 3. Page plan

```
PHONE (390)                         DESKTOP (1440)
┌──────────────────────┐            ┌──────────────────────────────────────────┐
│ Header               │            │ Header                                   │
│ Hero: headline,      │            │ Hero (approved design)                   │
│ chat card, voice /   │            │  text + chat card      │ journey picture │
│ login, picture       │            │                                          │
│ Proof: 92 · 29 · 18  │            │ Proof strip: 4 real counts in one row    │
│ Treatments: 2-col    │            │ Treatments: heading left, 3×2 tiles      │
│ tiles + see all      │            │                                          │
│ How it works: 4 steps│            │ How it works: 4 steps across             │
│ Costs: rows          │            │ Costs: 4 columns + exact-estimate button │
│ Why India: 6 promises│            │ Why India (navy): 3×2 promises           │
│ Network: partners or │            │ Network: hospitals/doctors or one line   │
│ one honest line      │            │                                          │
│ FAQ                  │            │ FAQ: heading left, questions right       │
│ Free plan form       │            │ Free plan: reassurance left, form right  │
│ For professionals    │            │ For professionals: one slim strip        │
│ Footer               │            │ Footer                                   │
└──────────────────────┘            └──────────────────────────────────────────┘
```

- **Removed from the default page** (kept in code, can be switched back on in
  Admin → Content → Sections): Why Shifain hub, package builder demo, upload
  band, sample tracker, promises band, comparison example, case-manager
  services, the separate Doctors section (merged into Network).
- **Merged:** six promises from five sections into one "Why India, with
  Shifain"; the process into four true steps; hospitals and doctors into one
  Network section; the closing band and plan form into one final section.
- **Hidden when empty:** patient stories (only verified stories are shown).

### Principles

1. **One next step at every point.** Each section ends with at most one
   primary action, and they all lead to the same place: a free plan.
2. **Say it once.** A promise appears in exactly one section.
3. **Nothing looks like data unless it is data.** Counts come from the
   catalogue; hospitals and doctors appear only with a signed tie-up.
4. **Bold once.** The hero is the memorable moment; every section below it
   is quiet: left-aligned headings, flat surfaces, one dark chapter (Why India).

### Review against the brief

- *Generic-default check.* A first pass gave every section a centred heading
  with a small violet label, and the same white cards. That is the template look
  the audit found, so headings are left-aligned with no labels. Mobile uses rows
  and lists rather than cards, and only one section turns dark.
- *Reference (Vaidam Health).* Its clarity comes from short sections with
  one job each: specialties, process, hospitals and doctors, costs, and a
  quote form. This plan keeps that order and that brevity, in Shifain's own
  palette and voice.
- *Numbered markers* are used only in "How it works", which is a real sequence.
