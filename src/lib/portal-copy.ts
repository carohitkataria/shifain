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
  // Shown only when the enquiry could not reach the database: say what is true then, and no more.
  title: l("We have your request", "Ваша заявка у нас", "So'rovingiz qabul qilindi"),
  body: l(
    "A coordinator will contact you on the phone number you gave, usually within 24 hours, and prepare your free plan with you. If you sent reports, they may ask you to send them again.",
    "Координатор свяжется с вами по указанному номеру телефона, обычно в течение 24 часов, и подготовит с вами бесплатный план. Если вы отправляли документы, вас могут попросить прислать их ещё раз.",
    "Koordinator siz bergan telefon raqami orqali, odatda 24 soat ichida bog'lanadi va siz bilan bepul reja tayyorlaydi. Agar hujjat yuborgan bo'lsangiz, ularni qayta yuborishingiz so'ralishi mumkin.",
  ),
  reference: l("Your reference", "Ваш номер обращения", "Murojaat raqamingiz"),
};
