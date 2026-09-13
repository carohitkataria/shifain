import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

// The doctor portal is live at /portal/doctor and is served by its own route.
export const PORTAL_ROLES = ["patient", "hospital"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export const isPortalRole = (value: string): value is PortalRole =>
  (PORTAL_ROLES as readonly string[]).includes(value);

/**
 * The portals are not open yet, so these pages say so plainly and hand the
 * visitor the step that does work today rather than a dead sign-in box.
 */
export const PORTAL_COPY: Record<PortalRole, { title: L; body: L; cta: L; ctaHref: string }> = {
  patient: {
    title: l("Patient portal", "Личный кабинет пациента", "Bemor kabineti"),
    body: l(
      "The patient portal — where you track your plan, documents and appointments — is opening soon. In the meantime, upload your reports and your AI plan and estimate are generated right away.",
      "Личный кабинет пациента, где вы отслеживаете план, документы и приёмы, скоро откроется. А пока загрузите документы — план и смета от ИИ будут готовы сразу.",
      "Reja, hujjatlar va qabullarni kuzatadigan bemor kabineti tez orada ochiladi. Hozircha hujjatlaringizni yuklang — AI reja va hisob darhol tayyorlanadi.",
    ),
    cta: l("Upload reports", "Загрузить документы", "Hujjatlarni yuklash"),
    ctaHref: "#quote-form",
  },
  hospital: {
    title: l("Hospital portal", "Кабинет клиники", "Shifoxona kabineti"),
    body: l(
      "The hospital portal — review cases, respond with plans and manage international patients — is opening soon. Get in touch and our partnerships team will take it from there.",
      "Кабинет клиники — изучение случаев, отправка планов и ведение иностранных пациентов — скоро откроется. Свяжитесь с нами, и команда по партнёрствам возьмёт это на себя.",
      "Shifoxona kabineti — holatlarni ko'rib chiqish, reja yuborish va xalqaro bemorlarni boshqarish — tez orada ochiladi. Biz bilan bog'laning, hamkorlik jamoamiz davom ettiradi.",
    ),
    cta: l("Contact the partnerships team", "Связаться с командой партнёрств", "Hamkorlik jamoasi bilan bog'lanish"),
    ctaHref: "mailto:care@shifain.com",
  },
};

export const PORTAL_BACK = l("Back to homepage", "На главную", "Bosh sahifaga");

export const ENQUIRY_RECEIVED = {
  title: l("Your reports are in", "Документы получены", "Hujjatlaringiz qabul qilindi"),
  body: l(
    "We are generating your AI-assisted plan and cost estimate now — it lands on your WhatsApp within minutes. The treating hospital confirms the final plan and the guaranteed price within 48 hours.",
    "Сейчас формируем ваш план и смету с помощью ИИ — они придут в WhatsApp в течение нескольких минут. Клиника подтвердит окончательный план и гарантированную цену в течение 48 часов.",
    "Hozir sun'iy intellekt yordamida reja va hisobingizni tayyorlayapmiz — bir necha daqiqada WhatsApp'ga keladi. Shifoxona yakuniy reja va kafolatlangan narxni 48 soat ichida tasdiqlaydi.",
  ),
  reference: l("Your reference", "Ваш номер обращения", "Murojaat raqamingiz"),
};
