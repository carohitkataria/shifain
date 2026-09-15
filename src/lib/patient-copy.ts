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
  referenceTab: l("Use my reference", "По номеру обращения", "Murojaat raqami bilan"),
  email: l("Email address", "Электронная почта", "Elektron pochta"),
  emailBody: l(
    "The address you gave us. We send a six-digit code to it.",
    "Адрес, который вы оставили. Мы пришлём на него шестизначный код.",
    "Siz qoldirgan manzil. Unga olti xonali kod yuboramiz.",
  ),
  sendCode: l("Send me a code", "Отправить код", "Kod yuborish"),
  codeSent: l(
    "If that address has a case with us, a code is on its way. It works for 15 minutes.",
    "Если по этому адресу есть обращение, код уже в пути. Он действует 15 минут.",
    "Agar bu manzilda murojaat bo'lsa, kod yo'lda. U 15 daqiqa amal qiladi.",
  ),
  codeViaCoordinator: l(
    "Email is not switched on for this site yet, so your coordinator has your code — call or message them and they will read it out. It works for 15 minutes.",
    "Отправка писем на этом сайте пока не включена — код есть у вашего координатора, он его продиктует. Код действует 15 минут.",
    "Bu saytda pochta yuborish hali yoqilmagan — kod koordinatoringizda, u aytib beradi. Kod 15 daqiqa amal qiladi.",
  ),
  codeShown: l(
    "Email is not switched on for this site yet, so here is your code. It works for 15 minutes.",
    "Отправка писем пока не включена, поэтому вот ваш код. Он действует 15 минут.",
    "Pochta hali yoqilmagan, shuning uchun kodingiz shu yerda. U 15 daqiqa amal qiladi.",
  ),
  code: l("Six-digit code", "Шестизначный код", "Olti xonali kod"),
  codeFailed: l(
    "That code did not work. Ask for a new one and try again.",
    "Код не подошёл. Запросите новый и попробуйте снова.",
    "Kod to'g'ri kelmadi. Yangisini so'rang va qayta urinib ko'ring.",
  ),
  verify: l("Sign in", "Войти", "Kirish"),
  useAnother: l("Use a different address", "Другой адрес", "Boshqa manzil"),
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
