import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

export const PATIENT_COPY = {
  signInTitle: l("Your ShifaIn file", "Ваше дело в ShifaIn", "ShifaIn'dagi ishingiz"),
  signInBody: l(
    "Sign in with the reference we sent you and the phone number you gave us. There is no password to remember.",
    "Войдите по номеру обращения и телефону, который вы оставили. Пароль не нужен.",
    "Murojaat raqamingiz va qoldirgan telefoningiz bilan kiring. Parol kerak emas.",
  ),
  reference: l("Your reference", "Номер обращения", "Murojaat raqami"),
  referenceHint: l("Looks like SH-XXXX-XXXX-XXXX-XXXX", "Вида SH-XXXX-XXXX-XXXX-XXXX", "SH-XXXX-XXXX-XXXX-XXXX ko'rinishida"),
  phone: l("Phone number", "Телефон", "Telefon raqami"),
  phoneHint: l(
    "The last few digits are enough.",
    "Достаточно последних цифр.",
    "Oxirgi raqamlar yetarli.",
  ),
  signIn: l("Open my file", "Открыть моё дело", "Ishimni ochish"),
  signOut: l("Sign out", "Выйти", "Chiqish"),
  failed: l(
    "That reference and phone number did not match a case.",
    "Номер обращения и телефон не совпали ни с одним делом.",
    "Bu murojaat raqami va telefon hech qaysi ishga mos kelmadi.",
  ),
  noReference: l(
    "Do not have a reference? Upload your reports and one is created for you straight away.",
    "Нет номера обращения? Загрузите документы — он появится сразу.",
    "Murojaat raqami yo'qmi? Hujjatlarni yuklang — u darhol yaratiladi.",
  ),
  title: l("Your cases", "Ваши обращения", "Sizning murojaatlaringiz"),
  empty: l("Nothing here yet.", "Здесь пока пусто.", "Bu yerda hozircha bo'sh."),
  openPlan: l("Open my plan", "Открыть план", "Rejani ochish"),
  reportsHeld: l("reports held", "документов хранится", "hujjat saqlanmoqda"),
  reportsUntil: l("until", "до", "gacha"),
  statuses: {
    new: l("Received", "Получено", "Qabul qilindi"),
    planning: l("Reading what you sent", "Изучаем присланное", "Yuborganingiz o'rganilmoqda"),
    planned: l("Plan ready", "План готов", "Reja tayyor"),
    "plan-failed": l("A coordinator is on it", "Этим занят координатор", "Koordinator shug'ullanmoqda"),
    confirmed: l("Confirmed by the hospital", "Подтверждено клиникой", "Shifoxona tasdiqladi"),
    closed: l("Closed", "Закрыто", "Yopilgan"),
  },
};
