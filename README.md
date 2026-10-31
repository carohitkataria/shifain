# ShifaIn

Marketing site for ShifaIn — medical journeys **to India**, planned with AI assistance and
run end to end. Built with Next.js (App Router), TypeScript and Tailwind CSS v4.

The homepage is driven entirely by a content store that a non-developer edits and publishes
from `/admin`.

## Getting started

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD and ADMIN_SECRET
npm run dev
```

- Site: http://localhost:3000 (redirects to a language, e.g. `/en`)
- Control panel: http://localhost:3000/admin

## Languages

English, Russian (`ru`) and Uzbek (`uz`). The site is generic — no country is singled out in
the copy or the enquiry form.

Language is chosen for the visitor in this order, and is always overridable from the header:

1. an explicit choice, remembered in the `shifain_locale` cookie
2. the country they are browsing from (`x-vercel-ip-country` / `cf-ipcountry` / `x-country-code`)
3. their `Accept-Language` header
4. English

Country→language mapping lives in `src/lib/i18n.ts` (`COUNTRY_LOCALE`); add a row there to
serve a new region a language it already has. Every piece of homepage copy is stored per
language; a blank translation falls back to English.

## Homepage control panel (`/admin`)

Sign in at `/admin/login` with the admin ID (`ADMIN_ID`, "admin" if unset) and `ADMIN_PASSWORD`.
Coordinators use the same page with their email and the password from Partner logins, and land
on the coordinator desk at `/coordinator`. The sidebar groups the areas — Overview, Site content, and Patients
& partners — and each group folds away, with the choice remembered per browser. Every page carries
its save button beside the title. Repeatable lists (paragraphs, badges, FAQ rows) can be added to
and removed from in place: both are submitted by the same form as the fields, so a half-written
paragraph is never lost to an accidental "Add". A hamburger-driven sidebar groups the areas, so new ones can be
added to `GROUPS` in `src/lib/admin-groups.ts` without touching the chrome. The panel can:

- **show, hide and reorder** every homepage section
- **publish the text and numbers** of each section, in all three languages
- **reset** back to the copy that ships with the code

Editors are generated from the content tree, so any field added to `SiteContent` becomes
editable automatically — there is no second schema to keep in sync.

### Where content lives

| | |
|---|---|
| `src/lib/content-types.ts` | shape of the homepage content |
| `src/lib/default-content.ts` | the copy that ships with the code (frozen at runtime) |
| `content/homepage.json` | what the admin panel publishes; absent until first publish |
| `src/lib/store.ts` | reads/writes the store and merges it over the defaults |

Published content is written to `content/homepage.json` (override with `SHIFAIN_CONTENT_PATH`).
Set that to a **writable persistent volume** in production — a serverless filesystem is
read-only and ephemeral, so publishing would silently fail or be lost. Swapping the store for a
database means reimplementing `getContent`/`saveContent`/`resetContent` in that one file.

Because the marketing pages are statically rendered per language, publishing calls
`revalidatePath("/", "layout")` so the live pages pick up the change.

## The homepage

Sections, in shipped order: hero and enquiry form · headline numbers · why ShifaIn (star) ·
your journey (path) · treatment categories · AI plan & estimate builder · upload reports band ·
live case tracker · price guarantee and translator · indicative costs · hospitals · doctors ·
comparison · included services (star) · why India (star) · for doctors & hospitals ·
patient stories · FAQ · closing call to action.

Notable pieces:

- **Star clusters** (`src/components/Star.tsx`) present features and USPs as points radiating
  from a hub, collapsing to a connected spine on narrow screens.
- **The journey path** (`src/components/Trail.tsx`) is a winding road on wide screens and a
  vertical trail on phones.
- **The package builder** (`src/components/PackageBuilder.tsx`) lets a visitor drop optional
  travel items (flights, stay, transfers) and recalculates the estimate live.
- **Treatment cards** link through to `/[locale]/treatments/[slug]`, generated from the same
  content the admin panel edits.
- **Logins**: patients sign in from the header; doctors and hospitals from the partner section
  low on the page.

## Enquiries

The hero form posts to `/api/enquiry`, which validates, assigns a reference and appends a
record to `.data/enquiries.jsonl` (override with `SHIFAIN_ENQUIRY_LOG`). Uploaded reports are
counted but **not stored** — wire `record()` in `src/app/api/enquiry/route.ts` to your case
system and object storage before launch.

## Not built yet

The patient and hospital portals are still placeholder pages that say so and offer the step that
does work today. The **doctor portal is live**: a referring doctor signs in at
`/[locale]/portal/doctor`, refers a patient with their reports, and follows every case they have
sent. Logins are created in the admin panel under **People → Partner logins**, or from the command
line with `npm run db:partner`.

## Who signs in, and how

| Who | Where | With what |
|---|---|---|
| Owner | `/admin/login` | `ADMIN_ID` and `ADMIN_PASSWORD` |
| Coordinator | `/admin/login`, then `/coordinator` | email and password, created in admin under Partner logins |
| Referring doctor | `/[locale]/portal/doctor` | email and password, created in admin |
| Patient | `/[locale]/portal/patient` | a six-digit code emailed to them, or their case reference and phone |

The patient's email route asks for an address, sends a code, and answers
identically whether or not that address has a case — so the page cannot be used
to find out who is a patient here. With no mail provider configured the code is
still issued and shown to a coordinator to read out, rather than a sign-in that
silently cannot work. WhatsApp OTP slots in beside it later: the code issuing
and checking in `src/lib/patient-auth.ts` is already independent of how the code
is delivered.

## Telling us what is wrong

Three routes, all of which produce a plan:

- **Upload reports** — the most accurate. PDFs and photos, read directly.
- **Describe it** — for a patient with nothing to hand.
- **Answer the standard questions** — for a patient who would rather not send
  documents to a company they have just met.

Country is asked before the phone number so the dialling code fills itself in,
and the code stays editable for anyone whose number does not match where they
live. The site opens in the language that fits the country the visitor is
browsing from, and every language stays in the header switcher.

## Reports

Uploaded files are kept for **30 days** so a coordinator and the treating
hospital can work from them, then deleted by MongoDB itself — a TTL index on
`expiresAt`, created by the app on its first upload rather than by a script
someone has to remember to run. A case keeps only what each report *was*; the
plan page and the patient portal both say when the files go.

## The AI plan

A patient uploads their reports on the homepage; a partner doctor uploads them on their portal.
Either way the case is opened immediately and the reports are read by Claude
(`src/lib/ai/plan.ts`) against the treatment catalogue in the database. The patient lands on
`/[locale]/plan/<reference>` while that happens and the page fills itself in.

Three rules hold the planner in place:

- **It chooses, it does not invent.** The disease, treatment and specialty codes it may return are
  a JSON-schema enum built from the catalogue, and the length of stay comes from `matching_rules`.
- **It never prices anything.** The estimate is looked up in `price_bands` and labelled as
  research; a figure only becomes a quote when a hospital supplies one under a signed tie-up.
- **It is not a diagnosis.** It reads what the reports already say, flags anything needing
  emergency care where the patient is now, and says what it still needs to see. A treating doctor
  confirms the plan within 48 hours.

It also picks the city we would most likely place the case in, and says whether this patient is
likely to be well enough for a day out. When they are — and only for treatments the catalogue
marks tour-friendly — the plan offers what is worth seeing from that city, as package lines the
patient adds or drops like any other. Dental work in Gurgaon offers the Red Fort; nothing on a
cancer or transplant pathway offers anything.

If the planner fails or no API key is set, the case is still opened and marked for a coordinator —
a patient who has uploaded their reports is never dropped.

Report files are not stored. The case keeps what each report was (filename, type, size) and the
plan derived from it.

## Managing the catalogue

Admin → Catalogue holds all 126 hospitals and every doctor record: add, edit and
delete, search by name, filter by city and stage. A doctor can be mapped to as
many hospitals as they actually work at, each with an optional rota — day, times,
slot length — so a plan can suggest an appointment that exists rather than one we
invented. Every field of that rota is optional, because most of it is unknown
until a partnership is live.

**Import a sheet** takes pasted CSV for hospitals, doctors, or doctor-to-hospital
mappings with days. Column names are matched loosely, so `Speciality`,
`Department` and `specialtyCode` all land in the same place. Importing never
publishes: rows arrive as research and stay invisible to patients until someone
signs a tie-up and publishes them by hand.

## Environment

| variable | purpose |
|---|---|
| `ADMIN_ID` | the owner's sign-in ID at `/admin/login`; "admin" if unset |
| `ADMIN_PASSWORD` | password for `/admin` (required in production) |
| `ADMIN_SECRET` | signs the admin session cookie; 16+ chars, required in production |
| `PARTNER_SECRET` | signs the partner-portal session cookie; falls back to `ADMIN_SECRET` |
| `MONGODB_URI` | catalogue and case database; without it the plan and portals are unavailable |
| `MONGODB_DB` | database name, default `shifain` |
| `ANTHROPIC_API_KEY` | reads uploaded reports and writes the plan |
| `RESEND_API_KEY` | sends the patient sign-in code; without it a coordinator reads the code out |
| `MAIL_FROM` | the address that code comes from |
| `SHIFAIN_CONTENT_PATH` | where published content is stored |
| `SHIFAIN_ENQUIRY_LOG` | where enquiries are appended |
| `SHIFAIN_NOINDEX` | set to `1` on preview deployments to keep them out of search engines |

## Theme

Brand colour is the Omnivest violet (`--color-brand: #7c3aed`), with a very light violet as the
alternating section background (`--color-surface-muted: #f8f6fe`). The design's other colours are
unchanged: navy ink for headings and dark bands, saffron for primary marketing calls to action,
green for confirmations and accreditation. All of it is defined once in the `@theme` block of
`src/app/globals.css`.

## Preview deployments

A preview service on Render tracks the development branch and redeploys on every
push, so the site can be reviewed in a browser without installing anything.

Set `SHIFAIN_NOINDEX=1` on any deployment that is not production: `robots.txt`
then disallows everything and every page is served with `X-Robots-Tag:
noindex, nofollow`. Both are decided per request, so the flag can be flipped
without rebuilding.

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # TypeScript, no emit
npm run lint       # ESLint
npm test           # the planner's contract: schema, catalogue codes, price bands

# The owner console, driven in a real browser (needs a running server):
npm i --no-save playwright-core
node scripts/test/admin-panel.mjs

npm run db:seed    # load src/data/catalogue into MongoDB
npm run db:partner -- --email dr@example.com --name "Dr A Rao" --role doctor
```
