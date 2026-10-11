import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

/**
 * Copy for the parts of the enquiry the admin panel does not yet own. The
 * labels that were already editable stay in the content store; these are the
 * new intake routes, which need to ship with sensible words in all three
 * languages before anyone edits them.
 */
export const INTAKE_COPY = {
  prefixLabel: l("Title", "Обращение", "Murojaat"),
  firstNameLabel: l("First name", "Имя", "Ism"),
  lastNameLabel: l("Last name", "Фамилия", "Familiya"),
  dialLabel: l("Code", "Код", "Kod"),
  phoneHint: l(
    "We fill the country code in for you — change it if yours is different.",
    "Код страны подставляется автоматически — измените, если ваш отличается.",
    "Mamlakat kodi avtomatik qo'yiladi — sizniki boshqacha bo'lsa, o'zgartiring.",
  ),
  emailLabel: l("Email (optional)", "Эл. почта (необязательно)", "Pochta (ixtiyoriy)"),
  emailPlaceholder: l("you@example.com", "you@example.com", "you@example.com"),
  emailHint: l(
    "Leave it and you can sign in later to follow your plan. We do not send marketing.",
    "Оставьте — и сможете войти позже, чтобы следить за планом. Рассылок не будет.",
    "Qoldiring — keyin kirib rejangizni kuzatasiz. Reklama yubormaymiz.",
  ),
  routeTitle: l("How would you like to tell us?", "Как вам удобнее рассказать?", "Qanday aytishni xohlaysiz?"),
  routes: {
    reports: l("Upload my reports", "Загрузить документы", "Hujjatlarimni yuklash"),
    description: l("Describe it myself", "Описать своими словами", "O'zim tasvirlab beraman"),
    questions: l("Answer a few questions", "Ответить на пару вопросов", "Bir nechta savolga javob berish"),
  },
  routeNotes: {
    reports: l(
      "The most accurate plan. Discharge summaries, scans, biopsy and blood reports all help.",
      "Самый точный план. Помогут выписки, снимки, биопсия и анализы.",
      "Eng aniq reja. Chiqish xulosalari, suratlar, biopsiya va tahlillar yordam beradi.",
    ),
    description: l(
      "No reports to hand? Tell us what is wrong in your own words and we will start from there.",
      "Нет документов под рукой? Расскажите своими словами — начнём с этого.",
      "Hujjat yo'qmi? O'z so'zlaringiz bilan ayting — shundan boshlaymiz.",
    ),
    questions: l(
      "Would rather not share documents yet? Answer these and you still get a plan.",
      "Пока не хотите делиться документами? Ответьте на вопросы — план всё равно будет.",
      "Hujjat ulashishni xohlamayapsizmi? Javob bering — reja baribir tayyorlanadi.",
    ),
  },
  descriptionLabel: l("What is wrong?", "Что случилось?", "Nima bo'ldi?"),
  descriptionPlaceholder: l(
    "For example: my father is 62, he has chest pain when he walks, and a doctor here said his heart arteries are blocked.",
    "Например: отцу 62 года, при ходьбеболит грудь, врач сказал, что забиты артерии сердца.",
    "Masalan: otamning yoshi 62, yurganda ko'kragi og'riydi, shifokor yurak tomirlari tiqilgan dedi.",
  ),
  questionsNote: l(
    "Answer what you can. Anything you leave blank, a coordinator will ask you about.",
    "Отвечайте, что знаете. О пропущенном спросит координатор.",
    "Bilganingizni yozing. Qolganini koordinator so'raydi.",
  ),
  privacyReports: l(
    "Your reports are kept for 30 days so your coordinator and the hospital can work from them, then deleted automatically.",
    "Документы хранятся 30 дней, чтобы координатор и клиника могли с ними работать, затем удаляются автоматически.",
    "Hujjatlar 30 kun saqlanadi — koordinator va shifoxona ular bilan ishlashi uchun, keyin avtomatik o'chiriladi.",
  ),
  questions: {
    problem: l("What is the main problem?", "В чём основная проблема?", "Asosiy muammo nima?"),
    duration: l("How long has it been going on?", "Как давно это продолжается?", "Bu qancha vaqtdan beri davom etmoqda?"),
    diagnosis: l("Has a doctor given it a name?", "Врач поставил диагноз?", "Shifokor tashxis qo'yganmi?"),
    advice: l("What did that doctor advise?", "Что посоветовал врач?", "Shifokor nima maslahat berdi?"),
    treatmentSoFar: l("What treatment have you had already?", "Какое лечение уже было?", "Qanday davolanish bo'lgan?"),
    age: l("How old is the patient?", "Сколько лет пациенту?", "Bemor necha yoshda?"),
    conditions: l(
      "Any diabetes, blood pressure, heart or kidney condition?",
      "Есть диабет, давление, болезни сердца или почек?",
      "Diabet, bosim, yurak yoki buyrak kasalligi bormi?",
    ),
    mobility: l(
      "Can the patient walk and travel unaided?",
      "Пациент ходит и передвигается сам?",
      "Bemor mustaqil yura va sayohat qila oladimi?",
    ),
  },
};

/** The homepage plan request: three short steps, contact details last. */
export const WIZARD_COPY = {
  subtitle: l(
    "Three quick steps. A coordinator who speaks your language follows up.",
    "Три коротких шага. Затем с вами свяжется координатор, говорящий на вашем языке.",
    "Uchta qisqa qadam. Keyin o'z tilingizda gaplashadigan koordinator bog'lanadi.",
  ),
  step: l("Step", "Шаг", "Qadam"),
  stepNames: [
    l("Treatment", "Лечение", "Davolash"),
    l("Condition", "Состояние", "Holat"),
    l("Contact", "Контакты", "Aloqa"),
  ],
  titles: [
    l("What do you need help with?", "С чем вам нужна помощь?", "Sizga qanday yordam kerak?"),
    l("Tell us about the condition", "Расскажите о состоянии", "Holat haqida aytib bering"),
    l("Where should we send your plan?", "Куда отправить ваш план?", "Rejangizni qayerga yuboraylik?"),
  ],
  somethingElse: l("Something else", "Другое", "Boshqa"),
  otherLabel: l("What treatment are you looking for?", "Какое лечение вы ищете?", "Qanday davolanish kerak?"),
  otherPlaceholder: l(
    "e.g. kidney stones, cataract, a second opinion",
    "например: камни в почках, катаракта, второе мнение",
    "masalan: buyrak toshi, katarakta, ikkinchi fikr",
  ),
  notSure: l("Not sure yet", "Пока не знаю", "Hali bilmayman"),
  needError: l(
    "Choose a treatment, or pick “Not sure yet”.",
    "Выберите лечение или «Пока не знаю».",
    "Davolashni tanlang yoki «Hali bilmayman»ni tanlang.",
  ),
  otherError: l("Tell us in a few words what you need.", "Опишите в двух словах, что нужно.", "Nima kerakligini qisqacha yozing."),
  recommended: l("Most accurate", "Самый точный", "Eng aniq"),
  routeHints: {
    reports: l(
      "PDF or photos of scans, reports, prescriptions",
      "PDF или фото снимков, заключений, рецептов",
      "Suratlar, xulosalar, retseptlar — PDF yoki rasm",
    ),
    description: l("In your own words, in any language", "Своими словами, на любом языке", "O'z so'zlaringiz bilan, istalgan tilda"),
    questions: l("A few short questions, no documents", "Несколько коротких вопросов, без документов", "Bir nechta qisqa savol, hujjatsiz"),
  },
  addFiles: l("Add reports", "Добавить документы", "Hujjat qo'shish"),
  addMore: l("Add more", "Добавить ещё", "Yana qo'shish"),
  fileHint: l(
    "PDF, JPG or PNG · up to 10 files, 25 MB in total",
    "PDF, JPG или PNG · до 10 файлов, всего 25 МБ",
    "PDF, JPG yoki PNG · 10 tagacha fayl, jami 25 MB",
  ),
  remove: l("Remove", "Удалить", "O'chirish"),
  tooMany: l(
    "That is more than 10 files or 25 MB — please send the most recent ones.",
    "Это больше 10 файлов или 25 МБ — отправьте самые свежие.",
    "Bu 10 tadan ko'p fayl yoki 25 MB dan ortiq — eng so'nggilarini yuboring.",
  ),
  conditionError: l(
    "Add at least one report, a short description, or answer one question.",
    "Добавьте хотя бы один документ, короткое описание или ответьте на один вопрос.",
    "Kamida bitta hujjat, qisqa tavsif yoki bitta savolga javob qo'shing.",
  ),
  moreQuestions: l("More questions (optional)", "Ещё вопросы (необязательно)", "Qo'shimcha savollar (ixtiyoriy)"),
  contactNote: l(
    "Your coordinator will message you on WhatsApp or call this number — nobody else sees it.",
    "Координатор напишет в WhatsApp или позвонит на этот номер — больше его никто не увидит.",
    "Koordinator WhatsApp orqali yozadi yoki shu raqamga qo'ng'iroq qiladi — boshqa hech kim ko'rmaydi.",
  ),
  nameError: l("Please enter a first name.", "Введите имя.", "Ismni kiriting."),
  countryError: l("Choose the country you live in.", "Выберите страну проживания.", "Yashash mamlakatingizni tanlang."),
  phoneError: l(
    "Enter a phone number we can reach you on.",
    "Укажите номер, по которому с вами можно связаться.",
    "Siz bilan bog'lanish mumkin bo'lgan raqamni kiriting.",
  ),
  emailError: l("That email address does not look right.", "Адрес почты выглядит неверно.", "Pochta manzili noto'g'ri ko'rinadi."),
  next: l("Continue", "Далее", "Davom etish"),
  back: l("Back", "Назад", "Orqaga"),
  submitting: l("Preparing your plan…", "Готовим ваш план…", "Rejangiz tayyorlanmoqda…"),
  trust: [
    l("Free, no obligation", "Бесплатно и без обязательств", "Bepul, majburiyatsiz"),
    l("Draft in minutes, hospital-confirmed in 48\u00a0h", "Черновик за минуты, подтверждение клиники за 48\u00a0ч", "Reja daqiqalarda, shifoxona tasdig'i 48 soatda"),
    l("Reports deleted after 30 days", "Документы удаляются через 30 дней", "Hujjatlar 30 kundan keyin o'chiriladi"),
  ],
};

export const TOUR_COPY = {
  title: l("While you are here", "Пока вы в Индии", "Siz Hindistonda ekansiz"),
  body: l(
    "Your treatment leaves room for a gentle day out, and your coordinator can arrange any of these. Add what appeals and leave the rest — your treating doctor has the final say on what you are up to.",
    "Ваше лечение оставляет время на спокойную прогулку — координатор всё организует. Добавьте, что нравится, остальное уберите. Последнее слово о нагрузке — за лечащим врачом.",
    "Davolanishingiz bemalol sayr uchun vaqt qoldiradi — koordinator hammasini tashkil qiladi. Yoqqanini qo'shing, qolganini olib tashlang. Yuklama haqida oxirgi so'z davolovchi shifokorda.",
  ),
  halfDay: l("Half day", "Полдня", "Yarim kun"),
  fullDay: l("Full day", "Целый день", "To'liq kun"),
  travel: l("away", "в пути", "yo'lda"),
  hours: l("h", "ч", "s"),
};
