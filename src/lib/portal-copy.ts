import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

// The doctor portal is live at /portal/doctor and is served by its own route.
export const PORTAL_ROLES = ["hospital"] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export const isPortalRole = (value: string): value is PortalRole =>
  (PORTAL_ROLES as readonly string[]).includes(value);

/**
 * The portals are not open yet, so these pages say so plainly and hand the
 * visitor the step that does work today rather than a dead sign-in box.
 */
export const PORTAL_COPY: Record<PortalRole, { title: L; body: L; cta: L; ctaHref: string }> = {
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
    "We are preparing your plan and cost estimate now — it lands on your WhatsApp within minutes. The treating hospital confirms the final plan and the guaranteed price within 48 hours.",
    "Сейчас готовим ваш план и смету — они придут в WhatsApp в течение нескольких минут. Клиника подтвердит окончательный план и гарантированную цену в течение 48 часов.",
    "Hozir reja va hisobingizni tayyorlayapmiz — bir necha daqiqada WhatsApp'ga keladi. Shifoxona yakuniy reja va kafolatlangan narxni 48 soat ichida tasdiqlaydi.",
  ),
  reference: l("Your reference", "Ваш номер обращения", "Murojaat raqamingiz"),
};
