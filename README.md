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

Sign in with `ADMIN_PASSWORD`. The panel can:

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
your journey (path) · treatment categories · AI plan & estimate builder · price guarantee and
translator · indicative costs · hospitals · doctors · comparison · included services (star) ·
why India (star) · for doctors & hospitals · patient stories · FAQ.

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

The patient, doctor and hospital portals are placeholder pages that say so and offer the step
that does work today. They are deliberately not sign-in forms, since there is no auth backend
behind them yet.

## Environment

| variable | purpose |
|---|---|
| `ADMIN_PASSWORD` | password for `/admin` (required in production) |
| `ADMIN_SECRET` | signs the admin session cookie; 16+ chars, required in production |
| `SHIFAIN_CONTENT_PATH` | where published content is stored |
| `SHIFAIN_ENQUIRY_LOG` | where enquiries are appended |
| `SHIFAIN_NOINDEX` | set to `1` on preview deployments to keep them out of search engines |

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
npm run lint       # Next.js lint
```
