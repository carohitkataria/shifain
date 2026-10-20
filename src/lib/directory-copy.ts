import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

export const DOCTOR_LIST_COPY = {
  title: l("Doctors", "Врачи", "Shifokorlar"),
  clear: l("Remove filter", "Убрать фильтр", "Filtrni olib tashlash"),
  body: l(
    "Every doctor here works at a hospital we have an agreement with, and has agreed to be listed. We do not publish a doctor's name, photograph or credentials without asking them first.",
    "Каждый врач здесь работает в клинике, с которой у нас есть договор, и дал согласие на публикацию. Мы не публикуем имя, фото и данные врача, не спросив его.",
    "Bu yerdagi har bir shifokor biz shartnoma tuzgan shifoxonada ishlaydi va ro'yxatga kirishga rozilik bergan. Shifokorning ismi, surati va ma'lumotlarini so'ramasdan e'lon qilmaymiz.",
  ),
  none: l(
    "No doctor profiles are published yet. Send us your reports and a coordinator brings you the doctors who fit your case, with the hospital's quoted price.",
    "Профили врачей пока не опубликованы. Пришлите документы — координатор подберёт подходящих врачей и цену клиники.",
    "Shifokor profillari hali e'lon qilinmagan. Hujjatlaringizni yuboring — koordinator mos shifokorlarni va shifoxona narxini taklif qiladi.",
  ),
  back: l("All doctors", "Все врачи", "Barcha shifokorlar"),
  worksAt: l("Where they see patients", "Где принимает", "Qayerda qabul qiladi"),
  days: l("Days", "Дни приёма", "Qabul kunlari"),
  anyDay: l("By arrangement", "По договорённости", "Kelishuv bo'yicha"),
  about: l("About", "О враче", "Shifokor haqida"),
  registration: l("Registration", "Регистрация", "Ro'yxatdan o'tish"),
  verified: l("Registration verified", "Регистрация проверена", "Ro'yxatdan o'tish tasdiqlangan"),
  experience: l("years of experience", "лет опыта", "yillik tajriba"),
  languages: l("Languages", "Языки", "Tillar"),
  procedures: l("Procedures performed", "Выполняемые процедуры", "Bajariladigan muolajalar"),
  qualifications: l("Qualifications", "Образование", "Ma'lumoti"),
  workHistory: l("Work experience", "Опыт работы", "Ish tajribasi"),
  memberships: l("Memberships", "Членство в организациях", "A'zolik"),
  awards: l("Awards and achievements", "Награды и достижения", "Mukofotlar va yutuqlar"),
  fees: l("Consultation fee", "Стоимость консультации", "Maslahat narxi"),
  inPerson: l("in person", "очно", "yuzma-yuz"),
  video: l("video", "видео", "video"),
  conditions: l("Conditions they treat", "Заболевания, которые лечит", "Davolaydigan kasalliklari"),
  opd: l("OPD", "Кабинет", "Qabul xonasi"),
  officialProfile: l("Profile on the hospital's website", "Профиль на сайте клиники", "Shifoxona saytidagi profil"),
  present: l("present", "по н. в.", "hozirgacha"),
  atHospital: l("at", "в", ""),
  filterAll: l("All specialties", "Все направления", "Barcha yo'nalishlar"),
};

export const CONDITION_COPY = {
  title: l("Conditions we plan for", "Заболевания, по которым мы планируем", "Biz reja tuzadigan kasalliklar"),
  body: l(
    "The conditions our planner recognises, and the treatment pathways behind each one. Choose yours to see what the journey usually involves and how long it takes.",
    "Заболевания, которые распознаёт наш планировщик, и пути лечения для каждого. Выберите своё, чтобы увидеть маршрут и сроки.",
    "Rejalashtiruvchimiz taniydigan kasalliklar va ularning davolash yo'llari. O'zingiznikini tanlang — safar va muddatni ko'rasiz.",
  ),
  pathways: l("Treatment pathways", "Пути лечения", "Davolash yo'llari"),
  stay: l("Usual stay", "Обычный срок", "Odatdagi muddat"),
  nights: l("nights in hospital", "ночей в стационаре", "kecha statsionarda"),
  days: l("days in India", "дней в Индии", "kun Hindistonda"),
  specialty: l("Handled by", "Направление", "Yo'nalish"),
  back: l("All conditions", "Все заболевания", "Barcha kasalliklar"),
  cta: l("Get a plan for this", "Получить план", "Bu bo'yicha reja olish"),
  hospitals: l("Hospitals that treat this", "Клиники, где это лечат", "Buni davolaydigan shifoxonalar"),
  doctors: l("Doctors who treat this", "Врачи, которые это лечат", "Buni davolaydigan shifokorlar"),
  related: l("Related conditions", "Связанные заболевания", "Bog'liq kasalliklar"),
  disclaimer: l(
    "These are planning figures from our catalogue, not a diagnosis and not a quote. Your treating doctor confirms the pathway and the hospital confirms the price.",
    "Это плановые ориентиры из нашего каталога, а не диагноз и не счёт. Лечащий врач подтверждает путь лечения, клиника — цену.",
    "Bular katalogimizdagi rejalashtirish ko'rsatkichlari, tashxis yoki hisob emas. Davolovchi shifokor yo'lni, shifoxona narxni tasdiqlaydi.",
  ),
};

/** The booking form on hospital and doctor pages. Every booking goes through Shifain. */
export const BOOKING_COPY = {
  title: l("Book through Shifain", "Записаться через Shifain", "Shifain orqali yozilish"),
  lead: l(
    "Free. A draft treatment plan and cost estimate in minutes; the hospital confirms within 48 hours.",
    "Бесплатно. Черновик плана лечения и сметы — за минуты; клиника подтверждает в течение 48 часов.",
    "Bepul. Davolash rejasi va narx hisobi loyihasi bir necha daqiqada; shifoxona 48 soat ichida tasdiqlaydi.",
  ),
  name: l("Patient name", "Имя пациента", "Bemorning ismi"),
  country: l("Country", "Страна", "Mamlakat"),
  countryPlaceholder: l("Choose your country", "Выберите страну", "Mamlakatingizni tanlang"),
  phone: l("Phone or WhatsApp", "Телефон или WhatsApp", "Telefon yoki WhatsApp"),
  email: l("Email (optional)", "Эл. почта (необязательно)", "Elektron pochta (ixtiyoriy)"),
  need: l("Specialty", "Направление", "Yo'nalish"),
  needPlaceholder: l("Not sure yet", "Пока не знаю", "Hali bilmayman"),
  problem: l("Describe the current medical problem", "Опишите текущую проблему", "Hozirgi muammoni tasvirlab bering"),
  problemHint: l(
    "Diagnosis, symptoms, and any treatment so far.",
    "Диагноз, симптомы и лечение, которое уже было.",
    "Tashxis, belgilar va shu paytgacha olingan davolash.",
  ),
  reports: l("Attach reports (optional)", "Прикрепить заключения (необязательно)", "Tahlillarni biriktirish (ixtiyoriy)"),
  reportsHint: l("PDF or photos, up to 10 files.", "PDF или фото, до 10 файлов.", "PDF yoki rasm, 10 tagacha fayl."),
  submit: l("Get my free plan and quote", "Получить бесплатный план и смету", "Bepul reja va narxni olish"),
  sending: l("Sending…", "Отправляем…", "Yuborilmoqda…"),
  privacy: l(
    "Your details go only to Shifain's care team and the hospital treating you.",
    "Ваши данные получают только команда Shifain и клиника, которая будет вас лечить.",
    "Ma'lumotlaringiz faqat Shifain jamoasi va sizni davolaydigan shifoxonaga beriladi.",
  ),
  book: l("Book appointment", "Записаться", "Yozilish"),
  whatsapp: l("WhatsApp us", "Написать в WhatsApp", "WhatsApp orqali yozish"),
  whatsappText: l("Hello Shifain, I would like to book at", "Здравствуйте, Shifain! Хочу записаться в", "Salom Shifain, men yozilmoqchiman:"),
  why: l("Why book through Shifain", "Почему через Shifain", "Nega Shifain orqali"),
  whyPoints: [
    l("One coordinator from first report to flight home", "Один координатор — от первого заключения до перелёта домой", "Birinchi tahlildan uyga qaytishgacha bitta koordinator"),
    l("Written estimate before you travel", "Письменная смета до поездки", "Safardan oldin yozma narx hisobi"),
    l("Visa letter, airport pickup and interpreter arranged", "Визовое письмо, встреча в аэропорту и переводчик", "Viza xati, aeroportda kutib olish va tarjimon"),
  ],
};
