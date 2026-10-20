/**
 * Reference lists for hospital onboarding that do not change with the
 * catalogue: accreditation bodies, services, languages, titles. Specialties,
 * procedures (treatments) and clinical capabilities live in the database,
 * because the planner matches cases against them.
 */

export type AccreditationBody = {
  code: string;
  name: string;
  issuingBody: string;
  scope: "global" | "country";
  country: string | null;
  /** The value the hospitals collection's validator accepts for `body`. */
  schemaBody: "NABH" | "JCI" | "NABL" | "Other";
};

export const ACCREDITATION_MASTER: AccreditationBody[] = [
  { code: "JCI", name: "JCI", issuingBody: "Joint Commission International", scope: "global", country: null, schemaBody: "JCI" },
  { code: "ISQUA", name: "ISQua", issuingBody: "International Society for Quality in Health Care", scope: "global", country: null, schemaBody: "Other" },
  { code: "GHA", name: "GHA", issuingBody: "Global Healthcare Accreditation", scope: "global", country: null, schemaBody: "Other" },
  { code: "ISO9001", name: "ISO 9001", issuingBody: "ISO (quality management)", scope: "global", country: null, schemaBody: "Other" },
  { code: "ISO27001", name: "ISO 27001", issuingBody: "ISO (information security)", scope: "global", country: null, schemaBody: "Other" },
  { code: "NABH", name: "NABH", issuingBody: "National Accreditation Board for Hospitals & Healthcare Providers", scope: "country", country: "India", schemaBody: "NABH" },
  { code: "NABL", name: "NABL", issuingBody: "National Accreditation Board for Testing and Calibration Laboratories", scope: "country", country: "India", schemaBody: "NABL" },
  { code: "HAI", name: "HA Thailand", issuingBody: "Healthcare Accreditation Institute", scope: "country", country: "Thailand", schemaBody: "Other" },
  { code: "SAS", name: "SAS", issuingBody: "Turkish Health Accreditation Standards", scope: "country", country: "Turkey", schemaBody: "Other" },
];

export const accreditationBody = (code: string) => ACCREDITATION_MASTER.find((item) => item.code === code);

export const HOSPITAL_TYPES = [
  { value: "super-specialty", label: "Super-specialty" },
  { value: "multi-specialty", label: "Multi-specialty" },
  { value: "single-specialty", label: "Single-specialty" },
];

export const OWNERSHIP = [
  { value: "private", label: "Private" },
  { value: "trust", label: "Trust / charitable" },
  { value: "government", label: "Government" },
  { value: "public-private", label: "Public–private partnership" },
];

/** How the public profile groups a hospital's services, in this order. */
export const FACILITY_GROUPS = ["support", "transport", "stay", "food", "money", "medical"] as const;
export type FacilityGroup = (typeof FACILITY_GROUPS)[number];

/** Services an international patient asks about before anything clinical. */
export const FACILITIES: { value: string; label: string; group: FacilityGroup }[] = [
  { value: "international-desk", label: "International patient desk", group: "support" },
  { value: "visa-letter", label: "Visa invitation letter", group: "support" },
  { value: "interpreter", label: "Interpreter service", group: "support" },
  { value: "teleconsultation", label: "Teleconsultation", group: "support" },
  { value: "medical-records-transfer", label: "Medical records transfer", group: "support" },
  { value: "concierge", label: "Personal assistance / concierge", group: "support" },
  { value: "welcome-package", label: "Welcome package", group: "support" },
  { value: "virtual-tour", label: "Virtual tour", group: "support" },
  { value: "airport-pickup", label: "Airport pickup", group: "transport" },
  { value: "ambulance", label: "Ambulance", group: "transport" },
  { value: "air-ambulance", label: "Air ambulance", group: "transport" },
  { value: "parking", label: "Parking", group: "transport" },
  { value: "private-rooms", label: "Private rooms", group: "stay" },
  { value: "family-accommodation", label: "Family accommodation", group: "stay" },
  { value: "accommodation", label: "Accommodation tie-ups", group: "stay" },
  { value: "international-lounge", label: "International lounge", group: "stay" },
  { value: "mobility-access", label: "Mobility-accessible rooms", group: "stay" },
  { value: "wifi", label: "Free Wi-Fi", group: "stay" },
  { value: "tv-in-room", label: "TV in room", group: "stay" },
  { value: "phone-in-room", label: "Phone in room", group: "stay" },
  { value: "safe-in-room", label: "Safe in room", group: "stay" },
  { value: "laundry", label: "Laundry", group: "stay" },
  { value: "dry-cleaning", label: "Dry cleaning", group: "stay" },
  { value: "business-centre", label: "Business centre", group: "stay" },
  { value: "fitness-centre", label: "Fitness centre", group: "stay" },
  { value: "nursery", label: "Nursery / nanny services", group: "stay" },
  { value: "prayer-room", label: "Prayer room / religious facilities", group: "stay" },
  { value: "cafe", label: "Café", group: "food" },
  { value: "dietary", label: "Dietary options (halal, vegetarian)", group: "food" },
  { value: "forex", label: "Foreign exchange", group: "money" },
  { value: "insurance", label: "Insurance tie-ups", group: "money" },
  { value: "emergency-24x7", label: "24×7 emergency", group: "medical" },
  { value: "pharmacy-24h", label: "24-hour pharmacy", group: "medical" },
];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ru", label: "Russian" },
  { value: "uz", label: "Uzbek" },
  { value: "kk", label: "Kazakh" },
  { value: "ky", label: "Kyrgyz" },
  { value: "tg", label: "Tajik" },
  { value: "tk", label: "Turkmen" },
  { value: "az", label: "Azerbaijani" },
  { value: "tr", label: "Turkish" },
  { value: "ar", label: "Arabic" },
  { value: "fa", label: "Persian" },
  { value: "bn", label: "Bengali" },
  { value: "ne", label: "Nepali" },
  { value: "fr", label: "French" },
  { value: "sw", label: "Swahili" },
];

export const languageLabel = (value: string) => LANGUAGES.find((item) => item.value === value)?.label ?? value;

export const DESIGNATIONS = [
  "Consultant",
  "Senior Consultant",
  "Associate Director",
  "Additional Director",
  "Director",
  "Head of Department",
  "Chief",
  "Chairman",
];

export const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export const DOCTOR_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const PACKAGE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const ROOM_CATEGORIES = [
  { value: "general", label: "General ward" },
  { value: "twin", label: "Twin sharing" },
  { value: "single", label: "Single room" },
  { value: "deluxe", label: "Deluxe room" },
  { value: "suite", label: "Suite" },
];

export const CURRENCIES = [
  { value: "USD", label: "USD" },
  { value: "INR", label: "INR" },
  { value: "EUR", label: "EUR" },
];

export const SLOT_MINUTES = [15, 20, 30];

export const CONSULT_TYPES = [
  { value: "in_person", label: "In person" },
  { value: "video", label: "Video" },
  { value: "both", label: "Both" },
];

/** How the agreement stands; "signed" is what the tie-up gate needs. Maps onto tieups.status. */
export const AGREEMENT_STATUSES = [
  { value: "draft", label: "Not signed yet", tieup: "draft" },
  { value: "signed", label: "Signed", tieup: "active" },
  { value: "expired", label: "Expired", tieup: "expired" },
  { value: "terminated", label: "Terminated", tieup: "terminated" },
] as const;
