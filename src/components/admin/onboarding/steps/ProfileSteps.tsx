import { saveStepAction } from "@/app/(admin)/admin/hospitals/onboarding-actions";
import type { Hospital } from "@/lib/catalogue";
import type { Masters } from "@/lib/onboarding";
import { ACCREDITATION_MASTER, FACILITIES, HOSPITAL_TYPES, LANGUAGES, OWNERSHIP } from "@/lib/onboarding-masters";
import { TH, adminField, adminLabel, Hint } from "../../Panel";
import { AreaField, CheckGrid, FieldGroup, SelectField, TextField, grid6 } from "../Fields";
import { RowsEditor } from "../RowsEditor";
import { StepActions } from "../Wizard";

export const STEP_FORM = "step-form";

/** The form every saving step posts through; the step name tells the action what to read. */
export function StepForm({
  hospital,
  step,
  back,
  children,
  multipart,
}: {
  hospital: Hospital;
  step: string;
  back: string | null;
  children: React.ReactNode;
  multipart?: boolean;
}) {
  // The buttons live inside the form so the one pressed (draft or continue) is posted with it.
  return (
    // React posts a server-action form as multipart itself, so files need no encType here.
    <form id={STEP_FORM} action={saveStepAction} data-files={multipart ? "" : undefined} className="space-y-5">
      <input type="hidden" name="id" value={hospital._id} />
      <input type="hidden" name="step" value={step} />
      {children}
      <StepActions form={STEP_FORM} back={back} />
    </form>
  );
}

const COUNTRIES = ["India", "Thailand", "Turkey", "United Arab Emirates", "Malaysia", "Singapore"];

export function BasicsStep({ hospital, masters, back }: { hospital: Hospital; masters: Masters; back: string | null }) {
  const desk = hospital.internationalDesk;
  return (
    <>
      <StepForm hospital={hospital} step="basics" back={back}>
        <FieldGroup title="Identity">
          <div className={grid6}>
            <TextField label="Display name" name="name" required span={3} defaultValue={hospital.name} hint="How patients see it, e.g. “Apollo Hospitals, Chennai”." />
            <TextField label="Legal name" name="legalName" span={3} defaultValue={hospital.legalName} hint="As on the agreement and invoices." />
            <SelectField label="Type" name="hospitalType" required span={2} defaultValue={hospital.hospitalType} options={HOSPITAL_TYPES} />
            <div className="min-w-0 sm:col-span-2">
              <label htmlFor="f-groupId" className={`${adminLabel} flex items-center`}>
                Group / chain
                <Hint text="Branches of one chain share a brand. Choose “New group” to add one." />
              </label>
              <select id="f-groupId" name="groupId" defaultValue={hospital.groupId ?? ""} className={adminField}>
                <option value="">No group</option>
                {masters.groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
                <option value="__new">New group…</option>
              </select>
            </div>
            <TextField label="New group name" name="newGroup" span={2} placeholder="Only if “New group”" />
            <TextField label="Year established" name="yearEstablished" type="number" span={2} min={1800} max={new Date().getFullYear()} defaultValue={hospital.yearEstablished} />
            <SelectField label="Ownership" name="ownership" span={2} defaultValue={hospital.ownership} options={OWNERSHIP} />
            <TextField label="Slug" name="slug" span={2} defaultValue={hospital.slug} placeholder="Made from the name if empty" hint="The web address part: /hospitals/<slug>. Lower case and hyphens." />
            <TextField label="Relationship manager" name="assignedRm" span={3} defaultValue={hospital.assignedRm} hint="The Shifain staff member who owns this record." />
            <TextField label="Website" name="officialWebsite" type="url" span={3} defaultValue={hospital.officialWebsite} placeholder="https://" />
            <TextField label="Public phone" name="phone" type="tel" span={3} defaultValue={hospital.phone} placeholder="+91-124-4511111" hint="The hospital's switchboard, shown on its public profile." />
          </div>
        </FieldGroup>

        <FieldGroup title="Location and access" hint="The airport and its distance drive travel estimates and how a hospital ranks for a patient.">
          <div className={grid6}>
            <TextField label="Address" name="address" span={6} defaultValue={hospital.address} autoComplete="street-address" />
            <TextField label="City" name="city" required span={2} defaultValue={hospital.city} />
            <TextField label="State" name="state" span={2} defaultValue={hospital.state} />
            <TextField label="Country" name="country" required span={1} defaultValue={hospital.country} list="countries" />
            <TextField label="PIN code" name="pincode" span={1} defaultValue={hospital.pincode} />
            <TextField label="Latitude" name="lat" type="number" step="any" span={1} min={-90} max={90} defaultValue={hospital.lat} />
            <TextField label="Longitude" name="lng" type="number" step="any" span={1} min={-180} max={180} defaultValue={hospital.lng} />
            <TextField label="Nearest international airport" name="nearestAirport" span={2} defaultValue={hospital.nearestAirport} placeholder="Indira Gandhi International" />
            <TextField label="IATA code" name="nearestAirportIata" span={1} defaultValue={hospital.nearestAirportIata} placeholder="DEL" />
            <TextField label="Distance (km)" name="airportDistanceKm" type="number" step="0.1" span={1} min={0} defaultValue={hospital.airportDistanceKm} />
          </div>
          <datalist id="countries">
            {COUNTRIES.map((country) => (
              <option key={country} value={country} />
            ))}
          </datalist>
        </FieldGroup>

        <FieldGroup title="International patient desk" hint="Stored as the hospital's contact. It is not a login: hospitals do not use this console.">
          <div className={grid6}>
            <TextField label="Contact name" name="deskName" span={2} defaultValue={desk?.contactName} />
            <TextField label="Email" name="deskEmail" type="email" span={2} defaultValue={desk?.email} />
            <TextField label="Phone" name="deskPhone" type="tel" span={2} defaultValue={desk?.phone} />
          </div>
        </FieldGroup>

        <FieldGroup title="About">
          <div className={grid6}>
            <AreaField label="About (English)" name="about" defaultValue={hospital.about} hint="Shown on the public profile once published." />
            <AreaField label="About (Russian)" name="aboutRu" span={3} rows={3} defaultValue={hospital.aboutRu} />
            <AreaField label="About (Uzbek)" name="aboutUz" span={3} rows={3} defaultValue={hospital.aboutUz} />
            <AreaField label="What sets it apart" name="usps" rows={3} defaultValue={(hospital.usps ?? []).join("\n")} placeholder="One per line, up to eight" />
          </div>
        </FieldGroup>
      </StepForm>
    </>
  );
}

export function InfrastructureStep({ hospital, masters, back }: { hospital: Hospital; masters: Masters; back: string | null }) {
  return (
    <>
      <StepForm hospital={hospital} step="infrastructure" back={back}>
        <FieldGroup title="Beds and theatres" hint="Shown on the profile as trust signals. Leave blank if not known; zero means none.">
          <div className={grid6}>
            <TextField label="Total beds" name="beds" type="number" min={0} span={2} defaultValue={hospital.beds} />
            <TextField label="ICU beds" name="icuBeds" type="number" min={0} span={2} defaultValue={hospital.icuBeds} />
            <TextField label="HDU / critical-care beds" name="hduBeds" type="number" min={0} span={2} defaultValue={hospital.hduBeds} />
            <TextField label="Operation theatres" name="otCount" type="number" min={0} span={2} defaultValue={hospital.otCount} />
            <TextField label="Cath labs" name="cathlabCount" type="number" min={0} span={2} defaultValue={hospital.cathlabCount} />
            <div className="hidden sm:col-span-2 sm:block" />
            <TextField label="Doctors" name="doctorCount" type="number" min={0} span={2} defaultValue={hospital.doctorCount} />
            <TextField label="Nurses" name="nurseCount" type="number" min={0} span={2} defaultValue={hospital.nurseCount} />
          </div>
        </FieldGroup>
        <FieldGroup title="Clinical capabilities" hint="The planner matches a case's needs (a cardiac ICU, a cath lab…) against these.">
          <CheckGrid
            legend="What the hospital can do"
            name="capabilities"
            options={masters.capabilities.map((item) => ({ value: item._id, label: item.name.en }))}
            checked={hospital.capabilities ?? []}
          />
        </FieldGroup>
      </StepForm>
    </>
  );
}

export function AccreditationsStep({ hospital, back }: { hospital: Hospital; back: string | null }) {
  const records = hospital.accreditationRecords ?? [];
  return (
    <>
      <StepForm hospital={hospital} step="accreditations" back={back} multipart>
        <FieldGroup
          title="Accreditations"
          hint="Status is worked out from the dates: valid, expiring within 90 days, or expired. Patients are told to check this, so both dates are required."
        >
          <RowsEditor
            name="acc"
            itemLabel="Accreditation"
            addLabel="Add another accreditation"
            empty="No accreditation yet. A hospital needs at least one in force to be published."
            fileUrl="/api/media"
            initial={records.map((record) => ({
              id: record.id,
              code: record.code,
              certificateNo: record.certificateNo ?? "",
              validFrom: record.validFrom ?? "",
              validTo: record.validTo ?? "",
              revoked: record.revoked,
              fileId: record.fileId ?? "",
            }))}
            fields={[
              { key: "id", label: "", type: "hidden" },
              {
                key: "code",
                label: "Accrediting body",
                type: "select",
                span: 2,
                required: true,
                options: ACCREDITATION_MASTER.map((item) => ({
                  value: item.code,
                  label: `${item.name}${item.country ? ` (${item.country})` : ""}`,
                })),
              },
              { key: "certificateNo", label: "Certificate no.", type: "text", span: 2 },
              { key: "status", label: "Status", type: "accreditation-status", span: 2 },
              { key: "validFrom", label: "Valid from", type: "date", span: 2, required: true },
              { key: "validTo", label: "Valid to", type: "date", span: 2, required: true },
              { key: "revoked", label: "Revoked by the body", type: "checkbox", span: 2 },
              { key: "file", label: "Certificate", type: "file", span: 6, accept: "application/pdf,image/png,image/jpeg,image/webp", hint: "PDF or image, up to 8 MB. Seen only by the Shifain team." },
            ]}
          />
        </FieldGroup>
      </StepForm>
    </>
  );
}

export function SpecialtiesStep({
  hospital,
  masters,
  coe,
  departmentBeds,
  back,
}: {
  hospital: Hospital;
  masters: Masters;
  coe: Set<string>;
  departmentBeds: Map<string, number>;
  back: string | null;
}) {
  const offered = new Set(hospital.specialtyCodes ?? []);
  const categoryName = (code: string) => masters.categories.find((item) => item._id === code)?.name.en ?? "Other";
  const byCategory = new Map<string, typeof masters.specialties>();
  for (const item of masters.specialties) byCategory.set(item.categoryCode, [...(byCategory.get(item.categoryCode) ?? []), item]);

  return (
    <>
      <StepForm hospital={hospital} step="specialties" back={back}>
        <FieldGroup title="Specialties and departments" hint="Tick what the hospital offers. A centre of excellence is a department it is known for; it lifts the hospital in matching.">
          <div className="relative overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-muted text-left">
                <tr>
                  <th scope="col" className={TH}>Specialty</th>
                  <th scope="col" className={TH}>Centre of excellence</th>
                  <th scope="col" className={TH}>Department beds</th>
                </tr>
              </thead>
              {[...byCategory.entries()].map(([category, items]) => (
                <tbody key={category}>
                  <tr className="border-t border-line bg-surface-muted/50">
                    <th scope="rowgroup" colSpan={3} className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {categoryName(category)}
                    </th>
                  </tr>
                  {items.map((item) => (
                    <tr key={item._id} className="border-t border-line">
                      <td className="px-3 py-1">
                        <label className="flex min-h-10 items-center gap-2.5 font-medium text-ink">
                          <input type="checkbox" name="specialtyCodes" value={item._id} defaultChecked={offered.has(item._id)} className="h-5 w-5 accent-brand" />
                          {item.name.en}
                        </label>
                      </td>
                      <td className="px-3 py-1">
                        <label className="flex min-h-10 items-center gap-2 text-ink-soft">
                          <input type="checkbox" name="coe" value={item._id} defaultChecked={coe.has(item._id)} className="h-5 w-5 accent-brand" aria-label={`${item.name.en} is a centre of excellence`} />
                          CoE
                        </label>
                      </td>
                      <td className="px-3 py-1">
                        <input
                          name={`beds.${item._id}`}
                          type="number"
                          min={0}
                          defaultValue={departmentBeds.get(item._id) ?? ""}
                          aria-label={`${item.name.en} beds`}
                          className={`${adminField} !w-28`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </FieldGroup>

        <FieldGroup title="Centres of excellence and institutes" hint="A named institute (e.g. an Institute of Cardiac Sciences) and the specialties it covers. Only specialties ticked above can be linked.">
          <RowsEditor
            name="centre"
            itemLabel="Centre"
            addLabel="Add a centre of excellence"
            empty="None added."
            initial={(hospital.centres ?? []).map((centre) => ({ id: centre.id, name: centre.name, description: centre.description ?? "", specialtyCodes: centre.specialtyCodes }))}
            fields={[
              { key: "id", label: "", type: "hidden" },
              { key: "name", label: "Name", type: "text", span: 3, required: true, placeholder: "Institute of Cardiac Sciences" },
              {
                key: "specialtyCodes",
                label: "Specialties",
                type: "multiselect",
                span: 3,
                options: masters.specialties.filter((item) => offered.has(item._id)).map((item) => ({ value: item._id, label: item.name.en })),
              },
              { key: "description", label: "Description", type: "textarea", span: 6 },
            ]}
          />
        </FieldGroup>
      </StepForm>
    </>
  );
}

export function FacilitiesStep({ hospital, back }: { hospital: Hospital; back: string | null }) {
  return (
    <>
      <StepForm hospital={hospital} step="facilities" back={back}>
        <FieldGroup title="Services for international patients">
          <CheckGrid legend="Available services" name="facilities" options={FACILITIES} checked={hospital.facilities ?? []} />
        </FieldGroup>
        <FieldGroup title="Languages supported" hint="Languages the international desk or interpreters can work in.">
          <CheckGrid legend="Languages" name="languages" options={LANGUAGES} checked={hospital.languages ?? []} columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
        </FieldGroup>
      </StepForm>
    </>
  );
}
