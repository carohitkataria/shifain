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
    "The address on your account or your case. We email a six-digit code to it.",
    "Адрес из вашего аккаунта или обращения. Мы пришлём на него шестизначный код.",
    "Akkauntingiz yoki murojaatingizdagi manzil. Unga olti xonali kod yuboramiz.",
  ),
  sendCode: l("Send me a code", "Отправить код", "Kod yuborish"),
  codeSent: l(
    "If that address has an account or a case with us, a code is on its way. It works for 15 minutes. Check your spam folder if it has not arrived in a minute.",
    "Если на этот адрес есть аккаунт или обращение, код уже в пути. Он действует 15 минут. Если письма нет через минуту, проверьте папку «Спам».",
    "Agar bu manzilda akkaunt yoki murojaat bo'lsa, kod yo'lda. U 15 daqiqa amal qiladi. Bir daqiqada kelmasa, «Spam» papkasini tekshiring.",
  ),
  mailFailed: l(
    "We could not send the email just now. Please try again in a minute, or sign in with your case reference.",
    "Сейчас не получилось отправить письмо. Попробуйте через минуту или войдите по номеру обращения.",
    "Hozir xat yuborib bo'lmadi. Bir daqiqadan so'ng qayta urinib ko'ring yoki murojaat raqami bilan kiring.",
  ),
  emailInvalid: l(
    "Please enter a full email address, like name@example.com.",
    "Введите полный адрес почты, например name@example.com.",
    "To'liq pochta manzilini kiriting, masalan name@example.com.",
  ),
  devCode: l("Development only — your code:", "Только для разработки — ваш код:", "Faqat ishlab chiqish uchun — kodingiz:"),
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
