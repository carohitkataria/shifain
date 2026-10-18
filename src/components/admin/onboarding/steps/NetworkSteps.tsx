import Link from "next/link";
import {
  addDoctorToHospitalAction,
  bulkDoctorsAction,
  linkExistingDoctorAction,
} from "@/app/(admin)/admin/hospitals/onboarding-actions";
import { isVerifiedDoctor, type Hospital } from "@/lib/catalogue";
import { isBookableRow, type DoctorAtHospital, type HospitalPackage, type Masters, type Tieup } from "@/lib/onboarding";
import { AGREEMENT_STATUSES, CURRENCIES, DOCTOR_STATUSES, PACKAGE_STATUSES, ROOM_CATEGORIES } from "@/lib/onboarding-masters";
import { mediaUrl, type MediaAsset } from "@/lib/media";
import { AdminIcon } from "../../AdminIcon";
import { TH, adminField, adminLabel } from "../../Panel";
import { AreaField, FieldGroup, SelectField, TextField, grid6 } from "../Fields";
import { RowsEditor } from "../RowsEditor";
import { SelectAll } from "../SelectAll";
import { StepForm } from "./ProfileSteps";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-surface-muted text-ink-soft",
  active: "bg-leaf/10 text-leaf",
  inactive: "bg-red-50 text-red-700",
};

export function DoctorsStep({
  hospital,
  doctors,
  others,
  masters,
  query,
  back,
  next,
}: {
  hospital: Hospital;
  doctors: DoctorAtHospital[];
  /** Doctors on record elsewhere, who can be added here too. */
  others: { _id: string; name: string }[];
  masters: Masters;
  query: { q?: string; spec?: string };
  back: string | null;
  next: string;
}) {
  const q = (query.q ?? "").trim().toLowerCase();
  const spec = query.spec ?? "";
  const specialtyName = (code: string | null | undefined) => (code ? (masters.specialties.find((item) => item._id === code)?.name.en ?? code) : "");
  const treatmentName = (code: string) => masters.treatments.find((item) => item._id === code)?.name.en ?? code;
  const shown = doctors.filter(({ doctor, link }) => {
    const codes = [doctor.specialtyCode, link.specialtyCode, ...(doctor.specialties ?? []).map((item) => item.code)];
    return (!q || doctor.name.toLowerCase().includes(q)) && (!spec || codes.includes(spec));
  });
  const page = `/admin/hospitals/${encodeURIComponent(hospital._id)}`;
  const offered = masters.specialties.filter((item) => (hospital.specialtyCodes ?? []).includes(item._id));

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <FieldGroup title="Add a doctor" hint="Creates the doctor at this hospital and opens their full profile: credentials, specialties and procedures, awards, schedule.">
          <form action={addDoctorToHospitalAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="hospitalId" value={hospital._id} />
            <label className="min-w-0 flex-1 basis-48">
              <span className={adminLabel}>Full name</span>
              <input name="name" required placeholder="Dr Anika Rao" className={adminField} />
            </label>
            <label className="min-w-0 basis-44">
              <span className={adminLabel}>Specialty</span>
              <select name="specialtyCode" defaultValue="" className={adminField}>
                <option value="">Choose…</option>
                {(offered.length ? offered : masters.specialties).map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name.en}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary min-h-11 !py-2.5 text-sm">
              Add and open
            </button>
          </form>
        </FieldGroup>
        <FieldGroup title="Doctor already on record?" hint="A doctor can work at more than one hospital. Add the existing record instead of creating a duplicate.">
          <form action={linkExistingDoctorAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="hospitalId" value={hospital._id} />
            <label className="min-w-0 flex-1 basis-56">
              <span className={adminLabel}>Doctor</span>
              <select name="doctorId" required defaultValue="" className={adminField}>
                <option value="" disabled>
                  {others.length ? "Choose a doctor" : "No other doctors on record"}
                </option>
                {others.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={!others.length} className="btn btn-secondary min-h-11 !py-2.5 text-sm disabled:opacity-50">
              Add here
            </button>
          </form>
        </FieldGroup>
      </div>

      <section className="card mt-5 p-5 sm:p-6" aria-labelledby="panel-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 id="panel-title" className="font-extrabold text-ink">
            Doctors on the panel <span className="font-semibold text-ink-soft">({doctors.length})</span>
          </h3>
          <form className="flex flex-wrap items-end gap-2" action={page}>
            <input type="hidden" name="step" value="doctors" />
            <label className="min-w-0 basis-44">
              <span className="sr-only">Search by name</span>
              <input name="q" type="search" defaultValue={query.q ?? ""} placeholder="Search by name" className={adminField} />
            </label>
            <label className="min-w-0 basis-40">
              <span className="sr-only">Specialty</span>
              <select name="spec" defaultValue={spec} className={adminField}>
                <option value="">All specialties</option>
                {masters.specialties.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name.en}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-secondary min-h-11 !py-2.5 text-sm">
              Filter
            </button>
          </form>
        </div>

        {doctors.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
            No doctors yet. Add the first above; publishing needs at least one doctor with a schedule.
          </p>
        ) : (
          <>
            <form id="bulk-form" action={bulkDoctorsAction} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted px-3 py-2">
              <input type="hidden" name="hospitalId" value={hospital._id} />
              <label htmlFor="bulk-op" className="text-sm font-semibold text-ink">
                With ticked doctors
              </label>
              <select id="bulk-op" name="op" required defaultValue="" className={`${adminField} !w-auto min-w-52`}>
                <option value="" disabled>
                  Choose an action
                </option>
                <optgroup label="Set status">
                  {DOCTOR_STATUSES.map((item) => (
                    <option key={item.value} value={`status:${item.value}`}>
                      Set status: {item.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Assign department">
                  {(offered.length ? offered : masters.specialties).map((item) => (
                    <option key={item._id} value={`department:${item._id}`}>
                      Department: {item.name.en}
                    </option>
                  ))}
                </optgroup>
                <option value="remove">Remove from this hospital</option>
              </select>
              <button type="submit" className="btn btn-secondary min-h-10 !py-2 text-sm">
                Apply
              </button>
            </form>

            <div className="relative mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface-muted text-left">
                  <tr>
                    <th scope="col" className="w-10 px-3 py-2.5">
                      <SelectAll form="bulk-form" label="Select all doctors shown" />
                    </th>
                    {["Doctor", "Specialty", "Experience", "Procedures", "Schedule", "Status", ""].map((heading) => (
                      <th key={heading || "edit"} scope="col" className={TH}>
                        {heading || <span className="sr-only">Edit</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ doctor, link, procedureCodes, schedules }) => {
                    const primary = doctor.specialties?.[0];
                    const days = schedules.filter(isBookableRow).length;
                    const edit = `/admin/doctors/${encodeURIComponent(doctor._id)}?hospital=${encodeURIComponent(hospital._id)}`;
                    return (
                      <tr key={doctor._id} className="border-t border-line align-top">
                        <td className="px-3 py-3">
                          <input type="checkbox" name="ids" value={doctor._id} form="bulk-form" aria-label={`Select ${doctor.name}`} className="h-5 w-5 accent-brand" />
                        </td>
                        <td className="px-3 py-3">
                          <Link href={edit} className="font-semibold text-ink hover:text-brand hover:underline">
                            {doctor.name}
                          </Link>
                          <span className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-ink-soft">
                            {link.designation ?? doctor.designation ?? null}
                            {isVerifiedDoctor(doctor) ? <span className="rounded-full bg-leaf/10 px-2 font-bold text-leaf">Verified</span> : null}
                            {!doctor.consentToList ? <span className="rounded-full bg-saffron/15 px-2 font-semibold text-[#9a5a05]">No listing consent</span> : null}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-ink">
                          {specialtyName(primary?.code ?? doctor.specialtyCode) || <span className="text-ink-muted">Not mapped</span>}
                          {primary?.subSpecialty ? <span className="block text-xs text-ink-soft">{primary.subSpecialty}</span> : null}
                          {link.specialtyCode && link.specialtyCode !== (primary?.code ?? doctor.specialtyCode) ? (
                            <span className="block text-xs text-ink-soft">Dept: {specialtyName(link.specialtyCode)}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-ink">{doctor.experienceYears ? `${doctor.experienceYears} yrs` : "—"}</td>
                        <td className="px-3 py-3">
                          {procedureCodes.length ? (
                            <span title={procedureCodes.map(treatmentName).join(", ")} className="text-ink">
                              {procedureCodes.length} mapped
                            </span>
                          ) : (
                            <span className="font-semibold text-red-700">None</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {days ? <span className="text-ink">{days} {days === 1 ? "day" : "days"} a week</span> : <span className="font-semibold text-[#9a5a05]">Not set</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[doctor.onboardingStatus ?? "draft"]}`}>
                            {DOCTOR_STATUSES.find((item) => item.value === (doctor.onboardingStatus ?? "draft"))?.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={edit} className="inline-flex min-h-9 items-center rounded-lg px-3 font-semibold text-brand hover:bg-brand-tint">
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {shown.length === 0 ? <p className="mt-3 text-sm text-ink-soft">No doctor matches that search.</p> : null}
          </>
        )}
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        {back ? (
          <Link href={back} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-ink-soft hover:bg-surface-muted hover:text-ink">
            <AdminIcon name="chevron" className="h-4 w-4 rotate-90" />
            Back
          </Link>
        ) : (
          <span />
        )}
        <Link href={next} className="btn btn-primary min-h-11 !py-2.5 text-sm">
          Continue
        </Link>
      </div>
    </>
  );
}

export function PackagesStep({ hospital, packages, masters, back }: { hospital: Hospital; packages: HospitalPackage[]; masters: Masters; back: string | null }) {
  const offered = masters.specialties.filter((item) => (hospital.specialtyCodes ?? []).includes(item._id));
  const procedures = masters.treatments.flatMap((treatment) =>
    offered.filter((item) => masters.scope.get(treatment._id)?.has(item._id)).map((item) => ({ value: treatment._id, label: treatment.name.en, group: item._id })),
  );
  return (
    <>
      <StepForm hospital={hospital} step="packages" back={back}>
        <FieldGroup title="Treatment packages" hint="A bundled treatment with a price range. The procedure must belong to one of the hospital's specialties; only active packages are shown to patients.">
          {offered.length === 0 ? (
            <p className="mb-3 rounded-lg bg-saffron/15 px-3 py-2 text-sm font-semibold text-ink">Map the hospital&rsquo;s specialties in step 4 first; packages are chosen from them.</p>
          ) : null}
          <RowsEditor
            name="pkg"
            itemLabel="Package"
            addLabel="Add a package"
            empty="No packages yet."
            initial={packages.map((item) => ({
              id: item._id,
              name: item.name,
              specialtyCode: item.specialtyCode,
              treatmentCode: item.treatmentCode,
              stayDays: item.stayDays?.toString() ?? "",
              roomCategory: item.roomCategory ?? "",
              priceMin: item.priceMin?.toString() ?? "",
              priceMax: item.priceMax?.toString() ?? "",
              currency: item.currency,
              inclusions: item.inclusions ?? "",
              exclusions: item.exclusions ?? "",
              status: item.status,
            }))}
            fields={[
              { key: "id", label: "", type: "hidden" },
              { key: "name", label: "Package name", type: "text", span: 4, required: true, placeholder: "Angioplasty with one stent" },
              { key: "status", label: "Status", type: "select", span: 2, required: true, options: PACKAGE_STATUSES, initialValue: "draft" },
              { key: "specialtyCode", label: "Specialty", type: "select", span: 3, required: true, options: offered.map((item) => ({ value: item._id, label: item.name.en })) },
              { key: "treatmentCode", label: "Procedure", type: "select", span: 3, required: true, options: procedures, filterBy: "specialtyCode" },
              { key: "priceMin", label: "Price from", type: "number", span: 1, min: 0 },
              { key: "priceMax", label: "Price to", type: "number", span: 1, min: 0 },
              { key: "currency", label: "Currency", type: "select", span: 1, options: CURRENCIES, initialValue: "USD" },
              { key: "stayDays", label: "Stay (days)", type: "number", span: 1, min: 0 },
              { key: "roomCategory", label: "Room", type: "select", span: 2, options: ROOM_CATEGORIES },
              { key: "inclusions", label: "Included", type: "textarea", span: 3, placeholder: "One per line" },
              { key: "exclusions", label: "Not included", type: "textarea", span: 3, placeholder: "One per line" },
            ]}
          />
        </FieldGroup>
      </StepForm>
    </>
  );
}

function Thumb({ asset, removeName, removeValue }: { asset: MediaAsset; removeName: string; removeValue?: string }) {
  return (
    <figure className="relative w-36 overflow-hidden rounded-xl border border-line bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a stored upload */}
      <img src={mediaUrl(asset._id)} alt={asset.filename} className="h-24 w-full object-cover" />
      <figcaption className="flex items-center justify-between gap-1 px-2 py-1.5">
        <span className="truncate text-xs text-ink-soft">{asset.filename}</span>
        <label className="flex items-center gap-1 text-xs font-semibold text-red-700">
          <input type="checkbox" name={removeName} value={removeValue ?? "on"} className="h-4 w-4 accent-red-600" />
          Remove
        </label>
      </figcaption>
    </figure>
  );
}

const fileInput =
  "block w-full text-sm text-ink file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-brand-tint file:px-4 file:font-semibold file:text-brand-deep";

export function MediaStep({ hospital, files, back }: { hospital: Hospital; files: MediaAsset[]; back: string | null }) {
  const media = hospital.media ?? { logoId: null, coverId: null, galleryIds: [], virtualTourUrl: null, videoUrl: null };
  const find = (id: string | null) => (id ? files.find((file) => file._id === id) : undefined);
  const logo = find(media.logoId);
  const cover = find(media.coverId);
  const gallery = media.galleryIds.map((id) => find(id)).filter((item): item is MediaAsset => Boolean(item));
  return (
    <>
      <StepForm hospital={hospital} step="media" back={back} multipart>
        <FieldGroup title="Logo and cover" hint="PNG, JPEG, WebP or GIF, up to 8 MB each. Shown publicly only once the hospital is published.">
          <div className={grid6}>
            <div className="sm:col-span-3">
              <label htmlFor="f-logo" className={adminLabel}>Logo</label>
              {logo ? <div className="mb-2"><Thumb asset={logo} removeName="remove-logo" /></div> : null}
              <input id="f-logo" type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/gif" className={fileInput} />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="f-cover" className={adminLabel}>Cover image</label>
              {cover ? <div className="mb-2"><Thumb asset={cover} removeName="remove-cover" /></div> : null}
              <input id="f-cover" type="file" name="cover" accept="image/png,image/jpeg,image/webp,image/gif" className={fileInput} />
            </div>
          </div>
        </FieldGroup>
        <FieldGroup title="Gallery" hint="Up to 24 pictures: rooms, theatres, the international lounge.">
          {gallery.length ? (
            <div className="mb-4 flex flex-wrap gap-3">
              {gallery.map((asset) => (
                <Thumb key={asset._id} asset={asset} removeName="removeGallery" removeValue={asset._id} />
              ))}
            </div>
          ) : (
            <p className="mb-3 text-sm text-ink-soft">No pictures yet.</p>
          )}
          <label htmlFor="f-gallery" className={adminLabel}>Add pictures</label>
          <input id="f-gallery" type="file" name="gallery" multiple accept="image/png,image/jpeg,image/webp,image/gif" className={fileInput} />
        </FieldGroup>
        <FieldGroup title="Tours and video">
          <div className={grid6}>
            <TextField label="Virtual tour link" name="virtualTourUrl" type="url" span={3} defaultValue={media.virtualTourUrl} placeholder="https://" />
            <TextField label="Introduction video link" name="videoUrl" type="url" span={3} defaultValue={media.videoUrl} placeholder="https://" />
          </div>
        </FieldGroup>
      </StepForm>
    </>
  );
}

export function CommercialsStep({ hospital, tieup, files, back }: { hospital: Hospital; tieup: Tieup | null; files: MediaAsset[]; back: string | null }) {
  const agreement = AGREEMENT_STATUSES.find((item) => item.tieup === tieup?.status)?.value ?? "draft";
  const file = tieup?.agreementFileId ? files.find((item) => item._id === tieup.agreementFileId) : undefined;
  return (
    <>
      <StepForm hospital={hospital} step="commercials" back={back} multipart>
        <FieldGroup title="Agreement" hint="A hospital is published only against a signed agreement with a reference — the tie-up the catalogue rests on.">
          <div className={grid6}>
            <SelectField label="Agreement status" name="agreementStatus" span={2} defaultValue={agreement} options={AGREEMENT_STATUSES.map(({ value, label }) => ({ value, label }))} placeholder="Choose…" />
            <TextField label="Agreement / tie-up reference" name="agreementRef" span={2} defaultValue={tieup?.agreementRef} placeholder="TIE-2026-014" />
            <div className="hidden sm:col-span-2 sm:block" />
            <TextField label="Contract start" name="contractStart" type="date" span={2} defaultValue={tieup?.contractStart} />
            <TextField label="Contract end" name="contractEnd" type="date" span={2} defaultValue={tieup?.contractEnd} />
            <div className="sm:col-span-6">
              <label htmlFor="f-agreement" className={adminLabel}>Signed agreement / MoU</label>
              {file ? (
                <a href={mediaUrl(file._id)} target="_blank" rel="noopener noreferrer" className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
                  <AdminIcon name="folder" className="h-4 w-4" />
                  {file.filename}
                </a>
              ) : null}
              <input id="f-agreement" type="file" name="agreement" accept="application/pdf,image/png,image/jpeg,image/webp" className={fileInput} />
            </div>
          </div>
        </FieldGroup>
        <FieldGroup title="Terms">
          <div className={grid6}>
            <TextField label="Facilitation commission %" name="commissionPercent" type="number" step="0.1" min={0} max={100} span={2} defaultValue={tieup?.commissionPercent} />
            <AreaField label="Payment terms" name="paymentTerms" span={4} rows={2} defaultValue={tieup?.paymentTerms} placeholder="e.g. 30 days from discharge, by bank transfer" />
            <label className="flex min-h-11 items-center gap-2.5 sm:col-span-3">
              <input type="checkbox" name="priceGuarantee" defaultChecked={tieup?.priceGuaranteeAgreed ?? false} className="h-5 w-5 accent-brand" />
              <span className="text-sm font-semibold text-ink">Price guarantee agreed</span>
            </label>
            <label className="flex min-h-11 items-center gap-2.5 sm:col-span-3">
              <input type="checkbox" name="kycVerified" defaultChecked={hospital.kycVerified ?? false} className="h-5 w-5 accent-brand" />
              <span className="text-sm font-semibold text-ink">KYC documents verified</span>
            </label>
          </div>
        </FieldGroup>
      </StepForm>
    </>
  );
}
