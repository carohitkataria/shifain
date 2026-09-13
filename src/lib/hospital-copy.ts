import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

export const HOSPITAL_COPY = {
  listTitle: l("Partner hospitals", "Клиники-партнёры", "Hamkor shifoxonalar"),
  listBody: l(
    "Every hospital here has a signed agreement with ShifaIn. We list only where we have one — so the price you are quoted is a price the hospital has committed to, and the desk that answers is expecting you.",
    "У каждой клиники здесь есть подписанное соглашение с ShifaIn. Мы публикуем только такие — поэтому названная цена подтверждена клиникой, а служба приёма вас уже ждёт.",
    "Bu yerdagi har bir shifoxona ShifaIn bilan shartnoma imzolagan. Biz faqat shundaylarni ko'rsatamiz — shuning uchun aytilgan narx shifoxona tomonidan tasdiqlangan va qabul bo'limi sizni kutadi.",
  ),
  none: l(
    "We are signing our first hospitals now, so there is nothing to list here yet. That is deliberate: we would rather show you nothing than show you a hospital we have no agreement with. Send us your reports and a coordinator will bring you the hospitals that fit your case, with their quoted prices.",
    "Сейчас мы подписываем первые клиники, поэтому список пока пуст. Это осознанно: лучше не показать ничего, чем показать клинику, с которой у нас нет договора. Пришлите документы — координатор подберёт подходящие клиники с их ценами.",
    "Hozir birinchi shifoxonalar bilan shartnoma imzolayapmiz, shuning uchun ro'yxat bo'sh. Bu ataylab: shartnomamiz yo'q shifoxonani ko'rsatgandan ko'ra hech narsa ko'rsatmagan afzal. Hujjatlaringizni yuboring — koordinator mos shifoxonalarni narxi bilan taklif qiladi.",
  ),
  cta: l("Get your plan and estimate", "Получить план и смету", "Reja va hisobni olish"),
  view: l("View hospital", "Открыть клинику", "Shifoxonani ochish"),
  back: l("All hospitals", "Все клиники", "Barcha shifoxonalar"),
  about: l("About this hospital", "О клинике", "Shifoxona haqida"),
  facts: l("At a glance", "Кратко", "Qisqacha"),
  beds: l("beds", "коек", "koyka"),
  icuBeds: l("ICU beds", "коек ИТ", "reanimatsiya koykasi"),
  specialties: l("Specialties", "Направления", "Yo'nalishlar"),
  capabilities: l("Equipment and units", "Оборудование и отделения", "Jihozlar va bo'limlar"),
  desk: l("International patient desk", "Отдел международных пациентов", "Xalqaro bemorlar bo'limi"),
  deskLanguages: l("Languages spoken", "Языки", "Tillar"),
  doctors: l("Doctors at this hospital", "Врачи клиники", "Shifoxona shifokorlari"),
  noDoctors: l(
    "Doctor profiles are published once each doctor has agreed to be listed.",
    "Профили врачей публикуются после согласия каждого врача.",
    "Shifokor profillari har bir shifokorning roziligidan keyin e'lon qilinadi.",
  ),
  website: l("Official website", "Официальный сайт", "Rasmiy sayt"),
  years: l("years", "лет опыта", "yillik tajriba"),
};
