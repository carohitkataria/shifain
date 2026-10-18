# Hospital onboarding

Shifain staff onboard a hospital through a 10-step wizard. Hospitals never log in to it. Their international desk contact is stored on the record as data, not as a user.

- **Where:** Admin → Care catalogue → Hospitals → a hospital (`/admin/hospitals/[id]?step=…`).
- **Doctors:** each doctor opens in a tabbed editor (`/admin/doctors/[id]?tab=…&hospital=…`).

## Lifecycle (maker–checker)

`Draft → Submitted → Under review → Approved → Published → (Suspended)`

- The console has one shared login, so each person states their name on the Review step (it is kept in a cookie for 90 days).
- Every change of status is written to the hospital's history, with who made it and a note.
- The person who submitted cannot take the hospital into review or approve it.
- Editing a hospital that is submitted, under review or approved sends it back to Draft. What was reviewed is no longer what is on the record. This also applies to editing one of its doctors.
- **Publishing:**
  - Sets `publication.state = "published"` against the signed agreement's reference. This is the same tie-up rule the catalogue already used.
  - Lists the hospital's active doctors who have agreed to be listed.
- **Suspending:**
  - Withdraws the hospital.
  - Withdraws any doctor who is listed only through this hospital.

## Review gate

The gate's rules are pure functions in `src/lib/onboarding-rules.ts` and are tested in `scripts/test/onboarding.test.mts`.

**Blocks submitting and publishing:**
- Missing name, city, country or type.
- No accreditation in force.
- No specialties.
- No active doctor with a schedule.
- An active doctor mapped to no procedure.
- A package whose procedure is not in the hospital's specialties.

**Blocks only publishing:** no signed agreement with a reference.

**Warnings (do not block):**
- An accreditation that is expired, revoked or expiring within 90 days.
- A doctor with no schedule, or no consent to be listed.
- A draft package.

Each issue names its step and is shown at the top of that step and on the Review step.

## How the spec maps onto the database

The existing catalogue collections are reused where they already modelled the relationship. New collections were added only where nothing fitted.

| Spec | Stored in |
|---|---|
| hospital | `hospitals`. New optional fields: `slug, groupId, yearEstablished, ownership, assignedRm, address, pincode, lat, lng, nearestAirport, airportDistanceKm, hduBeds, otCount, cathlabCount, doctorCount, nurseCount, accreditationRecords, centres, facilities, languages, media, kycVerified, onboarding` |
| hospital_group | `hospital_groups` (new) |
| accreditation_master | `ACCREDITATION_MASTER` in `src/lib/onboarding-masters.ts` |
| hospital_accreditation | `hospitals.accreditationRecords`. `hospitals.accreditations` keeps the public summary of those in force, in the shape the validator expects. Status is derived from the dates and never stored. |
| specialty / procedure | `specialties` / `treatments`, and `treatment_specialty_map` decides which procedures belong to which specialty |
| sub_specialty | `sub_specialties` (new). Staff can add one from the doctor editor. |
| hospital_specialty (+ CoE, beds) | `hospital_specialty_map` (`isCentreOfExcellence`, `bedCount`) and `hospitals.specialtyCodes` |
| centre_of_excellence + coe_specialty | `hospitals.centres[]` (name, description, specialty codes) |
| facility / language | constants in `src/lib/onboarding-masters.ts`, stored on `hospitals.facilities` and `hospitals.languages` |
| doctor | `doctors`. New optional fields: `slug, gender, photoId, registrationCouncil, registrationChecked, designation, languages, specialties, qualificationRecords, awards, memberships, experienceHistory, consultFee, teleconsultFee, currency, onboardingStatus` |
| doctor_hospital_affiliation | `hospital_doctor_map` (+ `designation`, `opdLocation`) |
| doctor_specialty (Category → Doctor 1) | `doctors.specialties[]`. The first one is primary and is mirrored to `specialtyCode`. |
| doctor_procedure (Category → Doctor 2) | `treatment_doctor_map` (`role: "performs"`) |
| doctor_schedule | `doctor_schedules`: one row per working day per hospital (+ `consultType`, `validFrom`, `validTo`) |
| schedule_exception | `schedule_exceptions` (new) |
| appointment | `doctor_appointments` (new). Free slots are computed by `computeSlots()` and never stored. |
| package | `hospital_packages` (new). Active packages also write `treatment_hospital_map`. |
| media_asset | `media_assets` (new; files in MongoDB, as reports are). Pictures of a published owner are public; certificates and agreements are for staff only (`/api/media/[id]`). |
| hospital_commercial | `tieups` (`commissionPercent`, `agreementRef`, contract dates, + `paymentTerms`, `agreementFileId`) |

The validators in `scripts/db/collections.mjs` describe every new field and collection. Running the seed script again applies them.

## Integrity rules enforced on the server

- A package's procedure must belong to its specialty, and that specialty must be one the hospital offers.
- A doctor's procedures must sit within the doctor's specialties.
- Accreditation dates are required, and valid-to must be on or after valid-from.
- Publishing needs approval, no blocking issues and a signed agreement.

## Not built here

- Patient reviews/testimonials (`review` in the spec). The site shows only verified patient stories, which are managed in site content.
- Patient booking of computed slots. The data and the slot computation are ready for the patient flow to use.
