import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

export const DOCTOR_COPY = {
  signInTitle: l("Partner doctor sign-in", "Вход для врача-партнёра", "Hamkor shifokor kirishi"),
  signInBody: l(
    "Refer a patient, follow their plan, and see what the treating hospital comes back with.",
    "Направьте пациента, следите за его планом и смотрите ответ принимающей клиники.",
    "Bemorni yo'llang, rejasini kuzating va shifoxona javobini ko'ring.",
  ),
  email: l("Email address", "Электронная почта", "Elektron pochta"),
  password: l("Password", "Пароль", "Parol"),
  signIn: l("Sign in", "Войти", "Kirish"),
  signOut: l("Sign out", "Выйти", "Chiqish"),
  signInFailed: l(
    "That email and password did not match an active partner account.",
    "Эта почта и пароль не соответствуют активному аккаунту партнёра.",
    "Bu pochta va parol faol hamkor hisobiga mos kelmadi.",
  ),
  noAccount: l(
    "No account yet? Our partnerships team sets these up — write to care@shifain.com from your clinic address.",
    "Нет аккаунта? Его создаёт наша команда по партнёрствам — напишите на care@shifain.com с адреса клиники.",
    "Hisob yo'qmi? Uni hamkorlik jamoamiz ochadi — klinika manzilingizdan care@shifain.com ga yozing.",
  ),
  dashboardTitle: l("Your referred patients", "Направленные вами пациенты", "Siz yo'llagan bemorlar"),
  referTitle: l("Refer a patient", "Направить пациента", "Bemor yo'llash"),
  referBody: l(
    "Upload the reports and the plan and estimate come back in about a minute. Your patient is not contacted until you say so.",
    "Загрузите документы — план и смета придут примерно за минуту. С пациентом не связываются, пока вы не разрешите.",
    "Hujjatlarni yuklang — reja va hisob bir daqiqada qaytadi. Siz aytmaguningizcha bemor bilan bog'lanilmaydi.",
  ),
  patientName: l("Patient name", "Имя пациента", "Bemor ismi"),
  patientPhone: l("Patient phone (with country code)", "Телефон пациента (с кодом страны)", "Bemor telefoni (mamlakat kodi bilan)"),
  patientCountry: l("Country they travel from", "Страна выезда", "Qaysi mamlakatdan keladi"),
  need: l("What they need", "Что им нужно", "Ularga nima kerak"),
  needPlaceholder: l(
    "e.g. bypass surgery, second opinion on a biopsy",
    "например: шунтирование, второе мнение по биопсии",
    "masalan: shuntlash, biopsiya bo'yicha ikkinchi fikr",
  ),
  reports: l("Medical reports", "Медицинские документы", "Tibbiy hujjatlar"),
  reportsNote: l(
    "PDF or photos, up to 10 files. Discharge summaries, scans, biopsy and blood reports all help.",
    "PDF или фото, до 10 файлов. Выписки, снимки, биопсия и анализы — всё помогает.",
    "PDF yoki rasm, 10 tagacha fayl. Chiqish xulosalari, suratlar, biopsiya va tahlillar yordam beradi.",
  ),
  submit: l("Get the plan", "Получить план", "Rejani olish"),
  empty: l(
    "Nothing referred yet. The first patient you send appears here with their plan.",
    "Пока никого не направлено. Первый отправленный пациент появится здесь вместе с планом.",
    "Hali hech kim yo'llanmagan. Birinchi bemor rejasi bilan shu yerda paydo bo'ladi.",
  ),
  viewPlan: l("Open plan", "Открыть план", "Rejani ochish"),
  statuses: {
    new: l("Received", "Получено", "Qabul qilindi"),
    planning: l("Reading reports", "Читаем документы", "Hujjatlar o'qilmoqda"),
    planned: l("Plan ready", "План готов", "Reja tayyor"),
    "plan-failed": l("With a coordinator", "У координатора", "Koordinatorda"),
    confirmed: l("Confirmed by hospital", "Подтверждено клиникой", "Shifoxona tasdiqladi"),
    closed: l("Closed", "Закрыто", "Yopilgan"),
  },
  privacy: l(
    "You are handling another person's medical records. Refer a patient only with their consent. ShifaIn keeps the plan and what the reports were; it does not keep the files themselves.",
    "Вы работаете с медицинскими документами другого человека. Направляйте пациента только с его согласия. ShifaIn хранит план и перечень документов, но не сами файлы.",
    "Siz boshqa odamning tibbiy hujjatlari bilan ishlayapsiz. Bemorni faqat roziligi bilan yo'llang. ShifaIn rejani va hujjatlar ro'yxatini saqlaydi, fayllarning o'zini emas.",
  ),
};
