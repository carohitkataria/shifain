/**
 * The ShifaIn catalogue schema.
 *
 * Every collection is created with a MongoDB $jsonSchema validator, so the
 * required fields are enforced by the database rather than by convention. The
 * two fields that appear almost everywhere carry the rules the business runs on:
 *
 *   provenance  — where a record came from and whether anyone has verified it
 *   publication — whether it may be shown to patients, and under which tie-up
 *
 * Nothing reaches the public site on `research`. See PUBLISHABLE in seed.mjs.
 */

const localized = {
  bsonType: "object",
  required: ["en"],
  properties: { en: { bsonType: "string" }, ru: { bsonType: "string" }, uz: { bsonType: "string" } },
};

const provenance = {
  bsonType: "object",
  required: ["source", "method"],
  properties: {
    source: { bsonType: "string" },
    sourceUrl: { bsonType: ["string", "null"] },
    method: { enum: ["authored", "public-registry", "third-party-research", "partner-supplied"] },
    collectedAt: { bsonType: ["string", "date", "null"] },
    verifiedAt: { bsonType: ["string", "date", "null"] },
    verifiedBy: { bsonType: ["string", "null"] },
  },
};

const publication = {
  bsonType: "object",
  required: ["state"],
  properties: {
    state: { enum: ["research", "verified", "published", "withdrawn"] },
    publishedAt: { bsonType: ["string", "date", "null"] },
    tieupId: { bsonType: ["string", "null"] },
  },
};

const range = (a, b) => ({
  bsonType: "object",
  required: [a, b],
  properties: { [a]: { bsonType: "int" }, [b]: { bsonType: "int" } },
});

const doc = (required, properties) => ({
  $jsonSchema: { bsonType: "object", required: ["_id", ...required], properties },
});

export const COLLECTIONS = [
  // ---------------------------------------------------------------- reference
  {
    name: "categories",
    validator: doc(["name", "tier"], {
      name: localized,
      tier: { enum: ["tier1", "tier2", "all"] },
      order: { bsonType: "int" },
      provenance,
    }),
    indexes: [{ key: { tier: 1, order: 1 } }],
  },
  {
    name: "specialties",
    validator: doc(["name", "categoryCode"], {
      name: localized,
      categoryCode: { bsonType: "string" },
      order: { bsonType: "int" },
      provenance,
    }),
    indexes: [{ key: { categoryCode: 1 } }],
  },
  {
    name: "capabilities",
    validator: doc(["name"], { name: localized, provenance }),
    indexes: [],
  },
  {
    name: "cities",
    validator: doc(["name", "country"], {
      name: { bsonType: "string" },
      state: { bsonType: ["string", "null"] },
      country: { bsonType: "string" },
      nearestAirportIata: { bsonType: ["string", "null"] },
    }),
    indexes: [{ key: { country: 1, name: 1 } }],
  },

  // ---------------------------------------------------------------- clinical
  {
    name: "diseases",
    validator: doc(["name", "primarySpecialtyCode", "specialtyCodes"], {
      name: localized,
      icd10: { bsonType: ["string", "null"] },
      primarySpecialtyCode: { bsonType: "string" },
      specialtyCodes: { bsonType: "array", items: { bsonType: "string" } },
      categoryCode: { bsonType: "string" },
      provenance,
    }),
    indexes: [{ key: { primarySpecialtyCode: 1 } }, { key: { categoryCode: 1 } }, { key: { icd10: 1 } }],
  },
  {
    name: "treatments",
    validator: doc(["name", "type", "primarySpecialtyCode", "inpatientNights", "daysInCountry"], {
      name: localized,
      type: {
        enum: ["surgical", "interventional", "medical", "radiation", "transplant", "diagnostic", "rehabilitation"],
      },
      primarySpecialtyCode: { bsonType: "string" },
      categoryCode: { bsonType: "string" },
      inpatientNights: range("min", "max"),
      daysInCountry: range("min", "max"),
      requiredCapabilities: { bsonType: "array", items: { bsonType: "string" } },
      // Whether a patient on this pathway is usually well enough, and here
      // long enough, for a gentle outing. A treating doctor still decides.
      tourFriendly: { bsonType: "bool" },
      provenance,
    }),
    indexes: [{ key: { primarySpecialtyCode: 1 } }, { key: { categoryCode: 1 } }, { key: { type: 1 } }],
  },

  // ---------------------------------------------------------------- maps
  {
    name: "disease_specialty_map",
    validator: doc(["diseaseCode", "specialtyCode"], {
      diseaseCode: { bsonType: "string" },
      specialtyCode: { bsonType: "string" },
      isPrimary: { bsonType: "bool" },
    }),
    indexes: [{ key: { diseaseCode: 1 } }, { key: { specialtyCode: 1 } }],
  },
  {
    name: "disease_treatment_map",
    validator: doc(["diseaseCode", "treatmentCode"], {
      diseaseCode: { bsonType: "string" },
      treatmentCode: { bsonType: "string" },
      intent: { enum: ["curative", "supportive", "palliative", "diagnostic"] },
    }),
    indexes: [{ key: { diseaseCode: 1 } }, { key: { treatmentCode: 1 } }],
  },
  {
    name: "treatment_specialty_map",
    validator: doc(["treatmentCode", "specialtyCode"], {
      treatmentCode: { bsonType: "string" },
      specialtyCode: { bsonType: "string" },
      isPrimary: { bsonType: "bool" },
    }),
    indexes: [{ key: { treatmentCode: 1 } }, { key: { specialtyCode: 1 } }],
  },
  {
    name: "matching_rules",
    validator: doc(["diseaseCode", "treatmentCode", "specialtyCode"], {
      diseaseCode: { bsonType: "string" },
      treatmentCode: { bsonType: "string" },
      specialtyCode: { bsonType: "string" },
      requiredCapabilities: { bsonType: "array", items: { bsonType: "string" } },
      inpatientNights: range("min", "max"),
      daysInCountry: range("min", "max"),
      note: { bsonType: "string" },
    }),
    indexes: [{ key: { diseaseCode: 1 } }, { key: { specialtyCode: 1 } }],
  },

  // ---------------------------------------------------------------- providers
  {
    name: "hospitals",
    validator: doc(["name", "city", "country", "partnerStatus", "publication", "provenance"], {
      legacyId: { bsonType: ["string", "null"] },
      name: { bsonType: "string" },
      legalName: { bsonType: ["string", "null"] },
      city: { bsonType: "string" },
      state: { bsonType: ["string", "null"] },
      country: { bsonType: "string" },
      nearestAirportIata: { bsonType: ["string", "null"] },
      hospitalType: { bsonType: ["string", "null"] },
      beds: { bsonType: ["int", "null"] },
      icuBeds: { bsonType: ["int", "null"] },
      accreditations: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["body"],
          properties: {
            body: { enum: ["NABH", "JCI", "NABL", "Other"] },
            reference: { bsonType: ["string", "null"] },
            validUntil: { bsonType: ["string", "date", "null"] },
            verifiedAt: { bsonType: ["string", "date", "null"] },
          },
        },
      },
      specialtyCodes: { bsonType: "array", items: { bsonType: "string" } },
      capabilities: { bsonType: "array", items: { bsonType: "string" } },
      internationalDesk: { bsonType: "object" },
      officialWebsite: { bsonType: ["string", "null"] },
      partnerStatus: { enum: ["prospect", "contacted", "negotiating", "signed", "suspended"] },
      publication,
      provenance,
    }),
    indexes: [
      { key: { city: 1 } },
      { key: { partnerStatus: 1 } },
      { key: { "publication.state": 1 } },
      { key: { specialtyCodes: 1 } },
      { key: { capabilities: 1 } },
      { key: { name: "text" } },
    ],
  },
  {
    name: "doctors",
    validator: doc(["name", "partnerStatus", "publication", "provenance", "consentToList"], {
      legacyId: { bsonType: ["string", "null"] },
      name: { bsonType: "string" },
      specialtyCode: { bsonType: ["string", "null"] },
      specialtyLabelRaw: { bsonType: ["string", "null"] },
      qualifications: { bsonType: ["string", "null"] },
      registrationNumber: { bsonType: ["string", "null"] },
      experienceYears: { bsonType: ["int", "null"] },
      officialProfileUrl: { bsonType: ["string", "null"] },
      // A doctor is personal data. Publication requires their consent, recorded here.
      consentToList: { bsonType: "bool" },
      partnerStatus: { enum: ["prospect", "contacted", "negotiating", "signed", "suspended"] },
      publication,
      thirdParty: { bsonType: ["object", "null"] },
      provenance,
    }),
    indexes: [
      { key: { specialtyCode: 1 } },
      { key: { "publication.state": 1 } },
      { key: { consentToList: 1 } },
      { key: { name: "text" } },
    ],
  },

  // ---------------------------------------------------------------- provider maps
  {
    name: "hospital_doctor_map",
    validator: doc(["hospitalId", "doctorId"], {
      hospitalId: { bsonType: "string" },
      doctorId: { bsonType: "string" },
      specialtyCode: { bsonType: ["string", "null"] },
      attachment: { enum: ["primary", "visiting", "consultant"] },
      current: { bsonType: "bool" },
      provenance,
    }),
    indexes: [{ key: { hospitalId: 1 } }, { key: { doctorId: 1 } }, { key: { specialtyCode: 1 } }],
  },
  {
    name: "hospital_specialty_map",
    validator: doc(["hospitalId", "specialtyCode"], {
      hospitalId: { bsonType: "string" },
      specialtyCode: { bsonType: "string" },
      departmentName: { bsonType: ["string", "null"] },
      isCentreOfExcellence: { bsonType: "bool" },
      provenance,
    }),
    indexes: [{ key: { hospitalId: 1 } }, { key: { specialtyCode: 1 } }],
  },
  {
    name: "treatment_hospital_map",
    validator: doc(["treatmentCode", "hospitalId"], {
      treatmentCode: { bsonType: "string" },
      hospitalId: { bsonType: "string" },
      annualVolume: { bsonType: ["int", "null"] },
      confirmedByHospital: { bsonType: "bool" },
      provenance,
    }),
    indexes: [{ key: { treatmentCode: 1 } }, { key: { hospitalId: 1 } }],
  },
  {
    name: "treatment_doctor_map",
    validator: doc(["treatmentCode", "doctorId"], {
      treatmentCode: { bsonType: "string" },
      doctorId: { bsonType: "string" },
      hospitalId: { bsonType: ["string", "null"] },
      role: { enum: ["performs", "manages", "consults"] },
      provenance,
    }),
    indexes: [{ key: { treatmentCode: 1 } }, { key: { doctorId: 1 } }],
  },

  // ---------------------------------------------------------------- commercial
  {
    name: "cost_estimates",
    validator: doc(["treatmentCode", "hospitalId", "currency", "source"], {
      treatmentCode: { bsonType: "string" },
      hospitalId: { bsonType: "string" },
      packageType: { enum: ["all-inclusive", "surgery-only", "per-cycle", "per-session", "indicative"] },
      currency: { bsonType: "string" },
      min: { bsonType: ["double", "int", "null"] },
      max: { bsonType: ["double", "int", "null"] },
      inclusions: { bsonType: "array", items: { bsonType: "string" } },
      exclusions: { bsonType: "array", items: { bsonType: "string" } },
      validFrom: { bsonType: ["string", "date", "null"] },
      validUntil: { bsonType: ["string", "date", "null"] },
      // Only a hospital-supplied figure may ever be shown as a quote.
      source: { enum: ["hospital-quoted", "negotiated-package", "indicative-research"] },
      provenance,
    }),
    indexes: [
      { key: { treatmentCode: 1, hospitalId: 1 } },
      { key: { source: 1 } },
      { key: { validUntil: 1 } },
    ],
  },
  {
    name: "tieups",
    validator: doc(["hospitalId", "status"], {
      hospitalId: { bsonType: "string" },
      status: { enum: ["draft", "active", "expired", "terminated"] },
      agreementRef: { bsonType: ["string", "null"] },
      contractStart: { bsonType: ["string", "date", "null"] },
      contractEnd: { bsonType: ["string", "date", "null"] },
      commissionPercent: { bsonType: ["double", "int", "null"] },
      priceGuaranteeAgreed: { bsonType: "bool" },
      coordinatorName: { bsonType: ["string", "null"] },
      deskLanguages: { bsonType: "array", items: { bsonType: "string" } },
      responseSlaHours: { bsonType: ["int", "null"] },
      notes: { bsonType: ["string", "null"] },
    }),
    indexes: [{ key: { hospitalId: 1 } }, { key: { status: 1 } }],
  },
  {
    name: "price_bands",
    validator: doc(["treatmentCode", "currency", "min", "max", "basis"], {
      treatmentCode: { bsonType: "string" },
      currency: { bsonType: "string" },
      min: { bsonType: ["double", "int"] },
      max: { bsonType: ["double", "int"] },
      // An indicative band is a planning figure, never a quote. Only a
      // cost_estimates row sourced from a hospital can be shown as a price.
      basis: { enum: ["indicative-research", "negotiated-average"] },
      inclusions: { bsonType: "array", items: { bsonType: "string" } },
      exclusions: { bsonType: "array", items: { bsonType: "string" } },
      provenance,
    }),
    indexes: [{ key: { treatmentCode: 1 }, options: { unique: true } }],
  },
  // ------------------------------------------------------------------ accounts
  {
    name: "partner_users",
    validator: doc(["email", "role", "passwordHash", "status"], {
      email: { bsonType: "string" },
      name: { bsonType: "string" },
      role: { enum: ["doctor", "hospital", "coordinator"] },
      // Which provider record this login speaks for, if any.
      doctorId: { bsonType: ["string", "null"] },
      hospitalId: { bsonType: ["string", "null"] },
      passwordHash: { bsonType: "string" },
      status: { enum: ["invited", "active", "suspended"] },
      createdAt: { bsonType: ["string", "date"] },
      lastLoginAt: { bsonType: ["string", "date", "null"] },
    }),
    indexes: [
      { key: { email: 1 }, options: { unique: true } },
      { key: { role: 1 } },
      { key: { doctorId: 1 } },
    ],
  },
  {
    name: "cases",
    // A case is the patient's file. Report contents are never stored here —
    // only what the reports were, and the plan derived from them.
    validator: doc(["status", "createdAt", "patient"], {
      status: { enum: ["new", "planning", "planned", "plan-failed", "confirmed", "closed"] },
      createdAt: { bsonType: ["string", "date"] },
      locale: { bsonType: "string" },
      patient: {
        bsonType: "object",
        required: ["name", "phone", "country"],
        properties: {
          name: { bsonType: "string" },
          phone: { bsonType: "string" },
          country: { bsonType: "string" },
          email: { bsonType: ["string", "null"] },
        },
      },
      statedNeed: { bsonType: ["string", "null"] },
      // How the patient told us: uploaded reports, described it themselves, or
      // answered the standard questions.
      intakeRoute: { enum: ["reports", "description", "questions"] },
      description: { bsonType: ["string", "null"] },
      answers: { bsonType: ["object", "null"] },
      reportsExpireAt: { bsonType: ["string", "null"] },
      reports: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["filename", "mediaType", "bytes"],
          properties: {
            id: { bsonType: "string" },
            filename: { bsonType: "string" },
            mediaType: { bsonType: "string" },
            bytes: { bsonType: ["int", "long"] },
          },
        },
      },
      plan: { bsonType: ["object", "null"] },
      planError: { bsonType: ["string", "null"] },
      // Set when a partner doctor submitted the case rather than the patient.
      referredBy: { bsonType: ["string", "null"] },
      updatedAt: { bsonType: ["string", "date", "null"] },
    }),
    indexes: [
      { key: { createdAt: -1 } },
      { key: { status: 1 } },
      { key: { referredBy: 1, createdAt: -1 } },
    ],
  },
  {
    name: "doctor_schedules",
    // When a doctor is at a hospital. Every field beyond the two ids is
    // optional: most of this is unknown until a partnership is live, and a
    // half-known rota is more useful to a coordinator than an empty one.
    validator: doc(["doctorId", "hospitalId"], {
      doctorId: { bsonType: "string" },
      hospitalId: { bsonType: "string" },
      day: { enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun", null] },
      from: { bsonType: ["string", "null"] },
      to: { bsonType: ["string", "null"] },
      slotMinutes: { bsonType: ["int", "null"] },
      note: { bsonType: ["string", "null"] },
      updatedAt: { bsonType: ["string", "date", "null"] },
    }),
    indexes: [
      { key: { doctorId: 1 } },
      { key: { hospitalId: 1 } },
      { key: { doctorId: 1, hospitalId: 1, day: 1 } },
    ],
  },
  {
    name: "attractions",
    // What a patient can reasonably see while they are here, per city. Only
    // ever offered for treatments marked tourFriendly, and only as an option.
    validator: doc(["city", "name", "kind", "travelHours"], {
      city: { bsonType: "string" },
      name: { bsonType: "string" },
      kind: { enum: ["heritage", "spiritual", "leisure"] },
      travelHours: { bsonType: ["double", "int"] },
      halfDay: { bsonType: "bool" },
      note: { bsonType: "string" },
      provenance,
    }),
    indexes: [{ key: { city: 1 } }],
  },
  {
    name: "case_reports",
    // The uploaded files themselves, kept for thirty days so a coordinator and
    // the treating hospital can work from them, then removed automatically by
    // the TTL index on expiresAt.
    validator: doc(["reference", "filename", "mediaType", "bytes", "uploadedAt", "expiresAt"], {
      reference: { bsonType: "string" },
      filename: { bsonType: "string" },
      mediaType: { bsonType: "string" },
      bytes: { bsonType: ["int", "long"] },
      data: { bsonType: "binData" },
      uploadedAt: { bsonType: ["string", "date"] },
      expiresAt: { bsonType: "date" },
    }),
    indexes: [
      { key: { reference: 1 } },
      { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
    ],
  },
  {
    name: "sources",
    validator: doc(["title", "kind", "publicationAllowed"], {
      title: { bsonType: "string" },
      url: { bsonType: ["string", "null"] },
      kind: { enum: ["authored", "public-registry", "third-party-research", "partner-supplied"] },
      usage: { bsonType: "string" },
      publicationAllowed: { bsonType: "bool" },
      collectedAt: { bsonType: ["string", "date", "null"] },
    }),
    indexes: [{ key: { kind: 1 } }],
  },
];

export const COLLECTION_NAMES = COLLECTIONS.map((c) => c.name);
