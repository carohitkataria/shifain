import type { L } from "./content-types";
import type { PlanPackageOption } from "./ai/plan-schema";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

/** The travel elements a patient can add to or drop from the package. */
export const PACKAGE_LINES: Record<
  PlanPackageOption,
  { icon: string; label: L; note: L; usdMin: number; usdMax: number }
> = {
  flights: {
    icon: "plane",
    label: l("Return flights", "Авиабилеты туда и обратно", "Borish-kelish aviachiptalari"),
    note: l(
      "Economy, for the patient and one companion, booked once dates are fixed.",
      "Эконом, для пациента и одного сопровождающего, после утверждения дат.",
      "Ekonom, bemor va bitta hamroh uchun, sanalar tasdiqlangach.",
    ),
    usdMin: 700,
    usdMax: 1400,
  },
  "airport-transfers": {
    icon: "car",
    label: l("Airport transfers", "Трансферы из аэропорта", "Aeroportdan transferlar"),
    note: l(
      "Met at arrivals and driven to the hospital, and back for the flight home.",
      "Встреча в аэропорту, дорога до клиники и обратно к вылету.",
      "Aeroportda kutib olish, shifoxonaga va qaytishda uchishga yetkazish.",
    ),
    usdMin: 60,
    usdMax: 120,
  },
  "visa-support": {
    icon: "visa",
    label: l("Medical visa support", "Помощь с медицинской визой", "Tibbiy viza yordami"),
    note: l(
      "Invitation letter from the hospital and the full application pack.",
      "Приглашение от клиники и полный пакет документов.",
      "Shifoxonadan taklifnoma va to'liq hujjatlar to'plami.",
    ),
    usdMin: 80,
    usdMax: 160,
  },
  accommodation: {
    icon: "bed",
    label: l("Stay for your companion", "Проживание для сопровождающего", "Hamroh uchun turar joy"),
    note: l(
      "A serviced room near the hospital for the nights you are not admitted.",
      "Номер рядом с клиникой на те ночи, когда вы не в стационаре.",
      "Statsionarda bo'lmagan kunlaringiz uchun shifoxona yonidagi xona.",
    ),
    usdMin: 35,
    usdMax: 90,
  },
  interpreter: {
    icon: "translate",
    label: l("Interpreter on site", "Переводчик на месте", "Joyida tarjimon"),
    note: l(
      "A person with you for consultations, on top of the live translator in the app.",
      "Человек рядом на консультациях — в дополнение к переводчику в приложении.",
      "Konsultatsiyalarda yoningizda odam — ilovadagi tarjimonga qo'shimcha.",
    ),
    usdMin: 150,
    usdMax: 400,
  },
  "local-sim": {
    icon: "chat",
    label: l("Local SIM and data", "Местная SIM и интернет", "Mahalliy SIM va internet"),
    note: l(
      "Handed to you on arrival so your family can reach you.",
      "Выдаётся по прилёте, чтобы семья могла до вас дозвониться.",
      "Kelganingizda beriladi, oilangiz siz bilan bog'lana oladi.",
    ),
    usdMin: 10,
    usdMax: 25,
  },
  meals: {
    icon: "check",
    label: l("Meals for your companion", "Питание для сопровождающего", "Hamroh uchun ovqat"),
    note: l(
      "Your own meals are part of the hospital package while you are admitted.",
      "Ваше питание входит в пакет клиники на время госпитализации.",
      "Sizning ovqatingiz statsionar davrida shifoxona paketiga kiradi.",
    ),
    usdMin: 90,
    usdMax: 220,
  },
  "post-treatment-followup": {
    icon: "stethoscope",
    label: l("Follow-up after you fly home", "Наблюдение после возвращения", "Uyga qaytgach kuzatuv"),
    note: l(
      "Scheduled video reviews with your treating doctor for twelve months.",
      "Плановые видеоконсультации с лечащим врачом в течение года.",
      "Davolovchi shifokor bilan bir yil davomida rejali video ko'riklar.",
    ),
    usdMin: 0,
    usdMax: 0,
  },
};

export const PLAN_COPY = {
  working: {
    title: l("Reading your reports", "Читаем ваши документы", "Hujjatlaringiz o'qilmoqda"),
    body: l(
      "This takes about a minute. The page refreshes itself — you do not need to do anything.",
      "Это займёт около минуты. Страница обновится сама — ничего делать не нужно.",
      "Bu bir daqiqacha vaqt oladi. Sahifa o'zi yangilanadi — hech narsa qilish shart emas.",
    ),
  },
  failed: {
    title: l("A coordinator is taking this one", "Этим займётся координатор", "Buni koordinator oladi"),
    body: l(
      "We could not finish the automatic plan for your reports, so a person is picking it up. You will hear from us on the number you gave, and nothing you uploaded is lost.",
      "Не удалось завершить автоматический план по вашим документам — им занимается человек. Мы свяжемся с вами по указанному номеру, всё загруженное сохранено.",
      "Hujjatlaringiz bo'yicha avtomatik reja yakunlanmadi — buni odam oladi. Siz qoldirgan raqam orqali bog'lanamiz, yuklagan hech narsangiz yo'qolmadi.",
    ),
  },
  redFlag: l("Please read this first", "Пожалуйста, прочитайте это в первую очередь", "Iltimos, avval buni o'qing"),
  reference: l("Your reference", "Ваш номер обращения", "Murojaat raqamingiz"),
  understanding: l("What your reports show", "Что показывают ваши документы", "Hujjatlaringiz nimani ko'rsatadi"),
  reportsRead: l("Reports read", "Прочитанные документы", "O'qilgan hujjatlar"),
  pathway: l("The treatment this points to", "Куда это ведёт по лечению", "Bu qanday davolashga olib boradi"),
  alternatives: l("Also considered", "Также рассмотрено", "Shuningdek ko'rib chiqildi"),
  stay: l("How long you would be in India", "Сколько вы пробудете в Индии", "Hindistonda qancha qolasiz"),
  nights: l("nights as an inpatient", "ночей в стационаре", "kecha statsionarda"),
  days: l("days in India in total", "дней в Индии всего", "kun Hindistonda jami"),
  itinerary: l("Your journey", "Ваш маршрут", "Sizning safaringiz"),
  packageTitle: l("Your package", "Ваш пакет", "Sizning paketingiz"),
  packageNote: l(
    "Switch anything off that you do not need. The estimate updates as you go.",
    "Отключите всё, что вам не нужно. Смета пересчитается сразу.",
    "Kerak bo'lmaganini o'chiring. Hisob darhol yangilanadi.",
  ),
  treatmentLine: l("Treatment and hospital stay", "Лечение и пребывание в клинике", "Davolash va shifoxonada yotish"),
  included: l("Included", "Включено", "Kiritilgan"),
  optional: l("Optional", "По желанию", "Ixtiyoriy"),
  total: l("Estimated total", "Предварительная сумма", "Taxminiy summa"),
  indicative: l(
    "Indicative range from our own research, not yet a hospital quote. The treating hospital confirms your guaranteed price within 48 hours, and you are not charged more than it unless something new is found during treatment.",
    "Ориентировочный диапазон по нашим данным, это ещё не счёт клиники. Клиника подтвердит гарантированную цену в течение 48 часов; больше вы не заплатите, если во время лечения не обнаружится что-то новое.",
    "Bu bizning tadqiqotimizga asoslangan taxminiy oraliq, hali shifoxona narxi emas. Shifoxona kafolatlangan narxni 48 soat ichida tasdiqlaydi; davolash paytida yangi narsa topilmasa, ko'proq to'lamaysiz.",
  ),
  noEstimate: l(
    "We do not publish a figure for this pathway yet. Your coordinator brings you the hospital's quoted price within 48 hours.",
    "По этому направлению мы пока не публикуем сумму. Координатор пришлёт цену клиники в течение 48 часов.",
    "Bu yo'nalish bo'yicha hali summa e'lon qilmaymiz. Koordinator shifoxona narxini 48 soat ichida yuboradi.",
  ),
  questions: l("What we still need to ask you", "Что нам ещё нужно у вас уточнить", "Sizdan yana nimani so'rashimiz kerak"),
  missing: l("Reports that would sharpen this", "Документы, которые уточнят план", "Rejani aniqlashtiradigan hujjatlar"),
  confidence: {
    low: l("Early read — treat this as a starting point", "Предварительное прочтение — это отправная точка", "Dastlabki o'qish — bu boshlang'ich nuqta"),
    medium: l("Reasonably clear from what you sent", "Достаточно ясно из присланного", "Yuborganingizdan yetarlicha aniq"),
    high: l("Your reports are clear on this", "Ваши документы это ясно показывают", "Hujjatlaringiz buni aniq ko'rsatadi"),
  },
  disclaimer: l(
    "This is a travel and treatment plan, not a diagnosis and not medical advice. It was produced by reading the reports you uploaded against our treatment catalogue. A treating doctor at the hospital reviews and confirms it before anything is booked.",
    "Это план поездки и лечения, а не диагноз и не медицинская консультация. Он составлен путём сопоставления загруженных вами документов с нашим каталогом лечения. Лечащий врач клиники проверяет и подтверждает его до любых бронирований.",
    "Bu safar va davolash rejasi, tashxis yoki tibbiy maslahat emas. U yuklagan hujjatlaringizni davolash katalogimiz bilan solishtirib tayyorlandi. Shifoxonadagi davolovchi shifokor hech narsa bron qilinishidan oldin uni tekshirib tasdiqlaydi.",
  ),
  back: l("Back to homepage", "На главную", "Bosh sahifaga"),
};
