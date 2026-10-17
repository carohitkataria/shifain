import { Panel, PortalFrame, PortalHeading } from "@/components/portal/PortalFrame";
import { PlanRequestForm } from "@/components/PlanRequestForm";
import { ACCOUNT_COPY } from "@/lib/portal-patient-copy";
import { portalPage, type PortalPageProps } from "@/lib/patient-portal-page";
import { COUNTRY_BY_NAME } from "@/lib/countries";
import { t } from "@/lib/localize";

export const dynamic = "force-dynamic";

/** Starting a case from inside the portal, with the patient's details already filled in. */
export default async function PortalNewCase(props: PortalPageProps) {
  const { locale, content, data } = await portalPage(props);
  const { account, active, identity } = data;
  const { hero, specialties } = content;

  // The account is the best source; failing that, the details on their latest case.
  const fromCase = active?.patient;
  const [caseFirst = "", ...caseRest] = (fromCase?.name && fromCase.name !== "Website patient" ? fromCase.name : "").split(" ");
  const country = account?.country || fromCase?.country || "";
  const dial = account?.dial || (COUNTRY_BY_NAME.get(country) ? `+${COUNTRY_BY_NAME.get(country)!.dial}` : "");
  const defaults = {
    firstName: account?.firstName || caseFirst,
    lastName: account?.lastName || caseRest.join(" "),
    country,
    dial,
    phone: account?.phone || (fromCase?.phone && dial ? fromCase.phone.replace(/\s+/g, "").replace(dial, "") : fromCase?.phone) || "",
    email: identity.kind === "email" ? identity.email : fromCase?.email ?? "",
  };

  return (
    <PortalFrame content={content} locale={locale} data={data} section="new">
      <PortalHeading title={t(ACCOUNT_COPY.newCaseTitle, locale)} lead={t(ACCOUNT_COPY.newCaseLead, locale)} />
      <Panel className="max-w-3xl">
        <PlanRequestForm
          locale={locale}
          treatments={specialties.items.map((item) => ({ slug: item.slug, title: item.title }))}
          labels={{
            submit: t(hero.form.submit, locale),
            country: t(hero.form.countryLabel, locale),
            countryPlaceholder: t(hero.form.countryPlaceholder, locale),
            phone: t(hero.form.phoneLabel, locale),
            privacy: t(hero.form.privacy, locale),
          }}
          defaults={defaults}
        />
      </Panel>
    </PortalFrame>
  );
}
