# ShifaIn master database

The catalogue that everything else hangs off: what a patient can have treated,
who could treat it, and where. `src/data/catalogue/*.json` is the source of
truth in git; `seed.mjs` pushes it into MongoDB.

```bash
MONGODB_URI="mongodb+srv://…" npm run db:seed
```

Re-running is safe. Rows are matched on `_id`, so nothing duplicates, and a row
that has disappeared from a catalogue file is pruned from the collections the
seed owns outright.

## What is in it

| Layer | Collections |
| --- | --- |
| Reference | `categories`, `specialties`, `capabilities`, `cities` |
| Clinical | `diseases`, `treatments` |
| Clinical mapping | `disease_specialty_map`, `disease_treatment_map`, `treatment_specialty_map`, `matching_rules` |
| Providers | `hospitals`, `doctors` |
| Provider mapping | `hospital_doctor_map`, `hospital_specialty_map`, `treatment_hospital_map`, `treatment_doctor_map` |
| Commercial | `cost_estimates`, `tieups` |
| Audit | `sources` |

The provider-mapping and commercial collections ship empty. They are filled as
the team signs hospitals — a seed can never invent a capability claim or a price.

## The publication gate

No provider record reaches the public site on the strength of research alone.
Every hospital and doctor is seeded as:

```js
partnerStatus: "prospect"
publication:  { state: "research", publishedAt: null, tieupId: null }
```

and a record is only publishable once it has moved to `state: "published"` with
a `tieupId` pointing at a signed row in `tieups`. `seed.mjs` will not drag a
record back to `research` once it has moved on, so a re-seed cannot undo a
tie-up.

Doctors carry `consentToList`, which starts `false`. A doctor's name and profile
stay internal until they have agreed to be listed.

## Where the starter data came from

`sources` records the origin of every seeded row and whether it may be
published. Third-party research (hospital and doctor names gathered to give the
team a contact list) is marked `publicationAllowed: false`. Doctor ratings
collected alongside those names live under `thirdParty` and are never projected
to the public site — they are a research signal, not ShifaIn's rating.

Clinical content — specialties, diseases, treatments, capabilities, lengths of
stay and matching rules — is authored for ShifaIn and is publishable.

Lengths of stay in `matching_rules` are planning inputs for the estimate. The
note on every row says so: a treating doctor confirms the plan.
