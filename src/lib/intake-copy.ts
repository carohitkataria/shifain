import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

/**
 * Copy for the parts of the enquiry the admin panel does not yet own. The
 * labels that were already editable stay in the content store; these are the
 * new intake routes, which need to ship with sensible words in all three
 * languages before anyone edits them.
 */
export const INTAKE_COPY = {
  dialLabel: l("Code", "Код", "Kod"),
  phoneHint: l(
    "We fill the country code in for you — change it if yours is different.",
    "Код страны подставляется автоматически — измените, если ваш отличается.",
    "Mamlakat kodi avtomatik qo'yiladi — sizniki boshqacha bo'lsa, o'zgartiring.",
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
