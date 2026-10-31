/**
 * The rules for reading a patient's report in the chat: what the AI is asked,
 * how its answer is checked, and how the reply is put together. Pure — no AI
 * call, no database — so it can be tested (scripts/test/report-reading.test.mts).
 */

export type ReportReading = {
  isMedical: boolean;
  /** "Blood test", "MRI of the knee", "Discharge summary"… in English. */
  documentType: string;
  /** What the report itself states, in English, for the coordinator and the planner. */
  findings: string;
  /** A catalogue specialty code, or null when none fits. */
  specialtyCode: string | null;
  /** The treatment or specialty to see, in a few English words, for the intake. */
  treatment: string;
  /** One English sentence for the intake's condition. */
  condition: string;
  /** The report itself flags something critical or urgent. */
  urgent: boolean;
  /** What to say to the patient, in their language. */
  reply: string;
};

export function reportPrompt(language: string, specialties: { code: string; name: string }[], note?: string): { system: string; user: string } {
  const system = `You read medical documents that international patients share with ShifaIn, which arranges planned treatment in India. Doctors review every case before any plan is final.

Read the attached document and return:
- isMedical: true only if it is a medical document (lab result, scan or imaging report, prescription, discharge summary, doctor's letter, ECG and similar).
- documentType: what it is, in a few English words.
- findings: in English, one to three sentences on what the document itself states — its impression or conclusion, a diagnosis it names, and any results it marks as abnormal, with the values. Report what is written; never add a diagnosis of your own. Empty if not medical.
- specialtyCode: which of these specialties usually looks after what the document shows, or "none": ${specialties.map((item) => `${item.code} (${item.name})`).join(", ") || "none available"}.
- treatment: the treatment or specialty to see, in a few English words, e.g. "cardiology evaluation" or "knee replacement" only if the document recommends it.
- condition: one English sentence summarising the problem the document shows, for the case file.
- urgent: true only if the document marks something as critical or urgent.
- reply: what to say to the patient, written in ${language}, at most three short sentences, plain words, no lists, no markdown: say what kind of document it is and what it shows in everyday language ("the report notes …"), name the kind of specialist who usually looks after this, and say ShifaIn's doctors will review it for their free treatment plan. Never say they definitely have a disease, never give a prognosis, never suggest medicine. If urgent, tell them to see a doctor promptly. If it is not a medical document, say kindly what it seems to be and ask them to share their medical report instead.`;
  const user = [note?.trim() ? `The patient wrote with it: "${note.trim().slice(0, 500)}"` : "", "Read the document."].filter(Boolean).join("\n");
  return { system, user };
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** The AI's answer, checked: a specialty only from the catalogue, nothing empty passed off as a reading. */
export function readReportResult(raw: Record<string, unknown>, specialties: { code: string }[]): ReportReading | null {
  const reply = text(raw.reply, 900);
  if (!reply) return null;
  const code = text(raw.specialtyCode, 60);
  const isMedical = raw.isMedical === true;
  return {
    isMedical,
    documentType: text(raw.documentType, 80),
    findings: isMedical ? text(raw.findings, 800) : "",
    specialtyCode: isMedical && specialties.some((item) => item.code === code) ? code : null,
    treatment: isMedical ? text(raw.treatment, 120) : "",
    condition: isMedical ? text(raw.condition, 400) : "",
    urgent: isMedical && raw.urgent === true,
    reply,
  };
}

export type ReplyLang = "en" | "ru" | "uz";

export const REPORT_WORDS: Record<
  "saved" | "unreadable" | "hospitals" | "addedToCase" | "whichTreatment",
  Record<ReplyLang, string>
> = {
  saved: {
    en: "Thank you — I've saved {file}.",
    ru: "Спасибо — я сохранил {file}.",
    uz: "Rahmat — {file} saqlandi.",
  },
  unreadable: {
    en: "I couldn't read it just now, but our doctors will review it for your free plan.",
    ru: "Сейчас не получилось его прочитать, но наши врачи изучат его для вашего бесплатного плана.",
    uz: "Hozir uni o'qiy olmadim, lekin shifokorlarimiz uni bepul rejangiz uchun ko'rib chiqadi.",
  },
  hospitals: {
    en: "Hospitals we work with for this include {list}; your free plan will match you with the right one.",
    ru: "Среди клиник, с которыми мы работаем по этому профилю: {list}. Бесплатный план подберёт подходящую.",
    uz: "Bu yo'nalishda hamkor shifoxonalarimiz orasida: {list}. Bepul reja sizga mosini tanlaydi.",
  },
  addedToCase: {
    en: "I've added it to your case, so your coordinator and doctors can see it.",
    ru: "Я добавил его в вашу заявку — координатор и врачи его увидят.",
    uz: "Uni arizangizga qo'shdim — koordinator va shifokorlar ko'radi.",
  },
  whichTreatment: {
    en: "Is there a treatment you're hoping for, or anything your doctor has said?",
    ru: "Есть ли лечение, на которое вы рассчитываете, или что сказал врач?",
    uz: "Qaysi davolanishni xohlaysiz yoki shifokor nima dedi?",
  },
};

/** "Apollo (Chennai), Medanta (Gurugram)": at most three, never a hospital that isn't published. */
export function hospitalList(hospitals: { name: string; city: string }[]): string {
  return hospitals
    .slice(0, 3)
    .map((item) => `${item.name} (${item.city})`)
    .join(", ");
}

/** What the patient typed with a file, kept in the intake's condition. */
export function withNote(current: string | null | undefined, note: string | null | undefined): string {
  const before = (current ?? "").trim();
  const said = (note ?? "").trim().slice(0, 500);
  if (!said || before.includes(said)) return before;
  return [before, said].filter(Boolean).join(" ").slice(0, 1000);
}

/** The intake's condition after a report: what the patient said, then what each report shows. */
export function mergeCondition(current: string | null | undefined, fromReport: string): string {
  const before = (current ?? "").trim();
  if (!fromReport) return before;
  if (before.includes(fromReport)) return before;
  return [before, `Report: ${fromReport}`].filter(Boolean).join(" ").slice(0, 1000);
}
