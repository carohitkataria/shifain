import type { L, SiteContent } from "./content-types";
import { SECTION_IDS } from "./content-types";

/** Compact helper for authoring a localized string. */
const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

const allSectionsOn = () =>
  Object.fromEntries(SECTION_IDS.map((id, i) => [id, { enabled: true, order: i }])) as SiteContent["sections"];

export const defaultContent: SiteContent = {
  version: 1,
  updatedAt: "1970-01-01T00:00:00.000Z",

  brand: {
    name: "ShifaIn",
    tagline: l(
      "Global health journeys to India",
      "Глобальные медицинские маршруты в Индию",
      "Hindistonga global salomatlik safarlari",
    ),
    wordmarkTagline: l("Trusted medical journey", "Надёжный путь к лечению", "Ishonchli tibbiy sayohat"),
  },

  contact: {
    phone: "+91 11 4000 0000",
    whatsapp: "+91 11 4000 0000",
    email: "care@shifain.com",
  },

  nav: {
    treatments: l("Treatments", "Лечение", "Davolash"),
    hospitals: l("Hospitals", "Больницы", "Shifoxonalar"),
    doctors: l("Doctors", "Врачи", "Shifokorlar"),
    costEstimate: l("Cost estimate", "Расчёт стоимости", "Xarajat hisobi"),
    packages: l("Packages", "Пакеты", "Paketlar"),
    stories: l("Stories", "Истории", "Hikoyalar"),
    patientLogin: l("Patient login", "Вход для пациентов", "Bemor kirishi"),
    ourProcess: l("Our Process", "Как мы работаем", "Jarayonimiz"),
    whyIndia: l("Why India", "Почему Индия", "Nega Hindiston"),
    aboutUs: l("About Us", "О нас", "Biz haqimizda"),
    loginSignup: l("Login / Sign Up", "Вход / Регистрация", "Kirish / Ro'yxatdan o'tish"),
  },

  sections: allSectionsOn(),

  hero: {
    eyebrow: l(
      "Your trusted partner for medical treatment in India",
      "Ваш надёжный партнёр для лечения в Индии",
      "Hindistonda davolanish uchun ishonchli hamkoringiz",
    ),
    headline: l("Plan Your Medical Treatment in India —", "Спланируйте лечение в Индии —", "Hindistonda davolanishni rejalashtiring —"),
    headlineAccent: l("with Confidence", "с уверенностью", "ishonch bilan"),
    body: l(
      "Get expert guidance, compare top hospitals, plan your treatment and travel — all in one place. Ask Shifain, anytime.",
      "Получите экспертную помощь, сравните лучшие клиники, спланируйте лечение и поездку — всё в одном месте. Спросите Shifain в любое время.",
      "Mutaxassis maslahatini oling, eng yaxshi shifoxonalarni solishtiring, davolanish va safarni rejalashtiring — barchasi bir joyda. Shifain'dan istalgan vaqtda so'rang.",
    ),
    primaryCta: l(
      "Get my free plan & estimate",
      "Получить бесплатный план и смету",
      "Bepul reja va hisobni olish",
    ),
    secondaryCta: l("Talk to a coordinator", "Связаться с координатором", "Koordinator bilan bog'lanish"),
    badges: [
      { id: "b1", label: l("Trusted Hospitals in India", "Проверенные клиники Индии", "Hindistonning ishonchli shifoxonalari") },
      { id: "b2", label: l("End-to-End Travel Support", "Помощь с поездкой от начала до конца", "Safar bo'yicha to'liq yordam") },
      { id: "b3", label: l("Personalized Care Assistance", "Персональная поддержка", "Shaxsiy g'amxo'rlik yordami") },
    ],
    chatTitle: l("Chat with Shifain", "Чат с Shifain", "Shifain bilan suhbat"),
    chatBody: l(
      "Ask anything about treatments, hospitals, or your travel plan",
      "Спросите о лечении, клиниках или плане поездки",
      "Davolash, shifoxonalar yoki safar rejangiz haqida so'rang",
    ),
    orLabel: l("or", "или", "yoki"),
    voiceCta: l("Speak to Shifain", "Поговорить с Shifain", "Shifain bilan gaplashish"),
    voiceBadge: l("New", "Новое", "Yangi"),
    loginCta: l("Login to get personalized plan", "Войдите, чтобы получить личный план", "Shaxsiy reja uchun kiring"),
    cardTitle: l("Plan · Travel · Treat", "План · Поездка · Лечение", "Reja · Safar · Davolash"),
    cardBody: l(
      "Your complete medical journey, made simple.",
      "Весь путь к лечению — просто и понятно.",
      "To'liq tibbiy safaringiz — oson va sodda.",
    ),
    imageAlt: l(
      "A smiling patient looking up, with a hospital, the Taj Mahal and a plane flying to India",
      "Улыбающаяся пациентка, клиника, Тадж-Махал и самолёт, летящий в Индию",
      "Jilmayib turgan bemor, shifoxona, Toj Mahal va Hindistonga uchayotgan samolyot",
    ),
    values: [
      { id: "v1", label: l("Trusted by patients from across the world", "Нам доверяют пациенты со всего мира", "Bizga butun dunyo bemorlari ishonadi") },
      { id: "v2", label: l("Access India's world-class healthcare", "Доступ к медицине мирового уровня в Индии", "Hindistonning jahon darajasidagi tibbiyoti") },
      { id: "v3", label: l("A healthier tomorrow, together", "Здоровое завтра — вместе", "Sog'lom ertaga — birgalikda") },
    ],
    form: {
      title: l(
        "Get your free treatment plan & cost estimate",
        "Получите бесплатный план лечения и смету",
        "Bepul davolash rejasi va xarajat hisobini oling",
      ),
      nameLabel: l("Full name", "Полное имя", "To'liq ism"),
      namePlaceholder: l("Your name", "Ваше имя", "Ismingiz"),
      phoneLabel: l("Phone / WhatsApp", "Телефон / WhatsApp", "Telefon / WhatsApp"),
      phonePlaceholder: l("Include country code", "С кодом страны", "Davlat kodi bilan"),
      countryLabel: l("Country", "Страна", "Davlat"),
      countryPlaceholder: l("Select your country", "Выберите страну", "Davlatingizni tanlang"),
      treatmentLabel: l("Treatment needed", "Необходимое лечение", "Kerakli davolash"),
      treatmentPlaceholder: l(
        "Select a treatment or describe your problem",
        "Выберите лечение или опишите проблему",
        "Davolashni tanlang yoki muammoni yozing",
      ),
      reportsLabel: l("Medical reports", "Медицинские документы", "Tibbiy hujjatlar"),
      reportsHint: l(
        "PDF, JPG or PNG — the more you share, the sharper the estimate",
        "PDF, JPG или PNG — чем больше документов, тем точнее смета",
        "PDF, JPG yoki PNG — qancha ko'p hujjat bo'lsa, hisob shunchalik aniq",
      ),
      submit: l("Get my free plan", "Получить бесплатный план", "Bepul rejani olish"),
      privacy: l(
        "Your information is kept private · No obligation",
        "Ваши данные конфиденциальны · Без обязательств",
        "Ma'lumotlaringiz maxfiy · Majburiyatsiz",
      ),
    },
  },

  stats: {
    items: [
      { id: "s1", value: "100,000+", label: l("Patients guided", "Пациентов сопровождено", "Bemorlarga yo'l ko'rsatildi") },
      { id: "s2", value: "4.8 ★", label: l("Average patient rating", "Средняя оценка пациентов", "O'rtacha bemor bahosi") },
      { id: "s3", value: "600+", label: l("JCI / NABH hospitals", "Клиник JCI / NABH", "JCI / NABH shifoxonalari") },
      { id: "s4", value: "400+", label: l("Treatments & procedures", "Видов лечения и процедур", "Davolash va muolajalar") },
    ],
  },

  usps: {
    eyebrow: l("Why ShifaIn", "Почему ShifaIn", "Nega ShifaIn"),
    title: l("Everything that usually takes weeks — at once", "Всё, что обычно занимает недели — сразу", "Odatda haftalar ketadigan ishlar — bir zumda"),
    body: l(
      "One upload sets the whole journey in motion. Everything below runs from the same case file.",
      "Одна загрузка запускает весь маршрут. Всё перечисленное ведётся по одному делу пациента.",
      "Bitta yuklash butun safarni boshlaydi. Quyidagilarning barchasi bitta ish faylida yuritiladi.",
    ),
    hubLabel: l("Your case", "Ваше дело", "Sizning ishingiz"),
    points: [
      {
        id: "u1",
        icon: "spark",
        title: l("Instant plan & estimate", "Мгновенный план и смета", "Tezkor reja va hisob"),
        body: l(
          "A full treatment plan and itemised cost in minutes — not in 48 hours.",
          "Полный план лечения и детальная смета за минуты, а не за 48 часов.",
          "To'liq davolash rejasi va batafsil hisob bir necha daqiqada, 48 soatda emas.",
        ),
      },
      {
        id: "u2",
        icon: "shield",
        title: l("Guaranteed price", "Гарантированная цена", "Kafolatlangan narx"),
        body: l(
          "The confirmed price holds. Nothing extra is charged unless treatment reveals a new finding.",
          "Подтверждённая цена не меняется. Доплата возможна только при новых медицинских находках.",
          "Tasdiqlangan narx o'zgarmaydi. Faqat yangi tibbiy holat aniqlansagina qo'shimcha to'lov bo'ladi.",
        ),
      },
      {
        id: "u3",
        icon: "translate",
        title: l("No language barrier", "Без языкового барьера", "Til to'sig'i yo'q"),
        body: l(
          "Our app's built-in live translator lets you speak with any doctor, nurse or driver.",
          "Встроенный в приложение переводчик позволяет говорить с любым врачом, медсестрой или водителем.",
          "Ilovadagi jonli tarjimon har qanday shifokor, hamshira yoki haydovchi bilan gaplashish imkonini beradi.",
        ),
      },
      {
        id: "u4",
        icon: "route",
        title: l("We handle everything", "Мы берём всё на себя", "Hammasini biz bajaramiz"),
        body: l(
          "Visa, flights, transfers, stay, admission and interpreters — all arranged for you.",
          "Виза, перелёты, трансферы, проживание, госпитализация и переводчики — всё организуем мы.",
          "Viza, parvoz, transfer, turar joy, gospitalizatsiya va tarjimonlar — barchasini biz tashkil qilamiz.",
        ),
      },
      {
        id: "u5",
        icon: "hospital",
        title: l("Accredited hospitals only", "Только аккредитованные клиники", "Faqat akkreditatsiyalangan shifoxonalar"),
        body: l(
          "JCI and NABH hospitals with dedicated international patient desks.",
          "Клиники JCI и NABH с отдельными отделами для иностранных пациентов.",
          "JCI va NABH shifoxonalari xalqaro bemorlar bo'limi bilan.",
        ),
      },
      {
        id: "u6",
        icon: "home",
        title: l("Follow-up back home", "Наблюдение после возвращения", "Uyga qaytgach kuzatuv"),
        body: l(
          "Your care does not end at the airport — remote follow-ups continue after you fly home.",
          "Забота не заканчивается в аэропорту — дистанционное наблюдение продолжается дома.",
          "G'amxo'rlik aeroportda tugamaydi — uyga qaytgach masofaviy kuzatuv davom etadi.",
        ),
      },
    ],
  },

  journey: {
    eyebrow: l("Your journey", "Ваш маршрут", "Sizning safaringiz"),
    title: l("From reports to recovery, one path", "От документов до выздоровления — один путь", "Hujjatdan sog'ayishgacha — yagona yo'l"),
    body: l(
      "You upload your reports. Everything after that is ours to run.",
      "Вы загружаете документы. Всё остальное — наша работа.",
      "Siz hujjatlarni yuklaysiz. Qolgan hamma ishni biz bajaramiz.",
    ),
    steps: [
      {
        id: "j1",
        icon: "upload",
        title: l("Upload your reports", "Загрузите документы", "Hujjatlaringizni yuklang"),
        body: l(
          "Share scans, prescriptions and test results in any language.",
          "Приложите снимки, назначения и результаты анализов на любом языке.",
          "Tasvirlar, retseptlar va tahlil natijalarini istalgan tilda yuboring.",
        ),
      },
      {
        id: "j2",
        icon: "spark",
        title: l("Instant plan & estimate", "Мгновенный план и смета", "Tezkor reja va hisob"),
        body: l(
          "An itemised plan appears in minutes — treatment, stay, travel and total cost.",
          "Детальный план появляется за минуты — лечение, проживание, поездка и общая стоимость.",
          "Batafsil reja bir necha daqiqada — davolash, turar joy, safar va umumiy xarajat.",
        ),
      },
      {
        id: "j3",
        icon: "sliders",
        title: l("Shape your package", "Настройте свой пакет", "Paketingizni sozlang"),
        body: l(
          "Add or remove flights, hotel stay, transfers and interpreter — the estimate updates live.",
          "Добавляйте или убирайте перелёты, отель, трансферы и переводчика — смета обновляется сразу.",
          "Parvoz, mehmonxona, transfer va tarjimonni qo'shing yoki olib tashlang — hisob darhol yangilanadi.",
        ),
      },
      {
        id: "j4",
        icon: "stethoscope",
        title: l("Doctor confirmation in 48 hours", "Подтверждение врача за 48 часов", "48 soatda shifokor tasdig'i"),
        body: l(
          "The treating specialist reviews your case and confirms the final plan and price.",
          "Лечащий специалист изучает случай и подтверждает окончательный план и цену.",
          "Davolovchi mutaxassis holatni ko'rib chiqadi va yakuniy reja hamda narxni tasdiqlaydi.",
        ),
      },
      {
        id: "j5",
        icon: "plane",
        title: l("We arrange the travel", "Мы организуем поездку", "Safarni biz tashkil qilamiz"),
        body: l(
          "Medical visa, flights, airport pickup, accommodation and admission — handled end to end.",
          "Медицинская виза, перелёты, встреча в аэропорту, проживание и госпитализация — под ключ.",
          "Tibbiy viza, parvoz, aeroportdan kutib olish, turar joy va gospitalizatsiya — to'liq xizmat.",
        ),
      },
      {
        id: "j6",
        icon: "home",
        title: l("Treatment & follow-up home", "Лечение и наблюдение дома", "Davolash va uyda kuzatuv"),
        body: l(
          "Treatment at the guaranteed price, then remote follow-ups once you are back home.",
          "Лечение по гарантированной цене, затем дистанционное наблюдение после возвращения.",
          "Kafolatlangan narxda davolash, so'ngra uyga qaytgach masofaviy kuzatuv.",
        ),
      },
    ],
    footnote: l(
      "A dedicated case manager stays with you at every stop on this path.",
      "На каждом этапе этого пути с вами персональный менеджер.",
      "Bu yo'lning har bir bosqichida siz bilan shaxsiy menejer bo'ladi.",
    ),
  },

  specialties: {
    eyebrow: l("Treatment categories", "Направления лечения", "Davolash yo'nalishlari"),
    title: l("Specialised care, matched to you", "Специализированная помощь под ваш случай", "Sizga mos ixtisoslashgan yordam"),
    body: l(
      "Every plan is confirmed by the treating doctor after a medical evaluation.",
      "Каждый план подтверждается лечащим врачом после медицинской оценки.",
      "Har bir reja tibbiy baholashdan so'ng davolovchi shifokor tomonidan tasdiqlanadi.",
    ),
    linkLabel: l("Explore treatment", "Подробнее о лечении", "Davolash haqida batafsil"),
    items: [
      {
        slug: "cardiac-care",
        icon: "❤️",
        title: l("Cardiac care", "Кардиология", "Kardiologiya"),
        body: l(
          "Bypass (CABG), valve replacement, angioplasty and paediatric heart surgery.",
          "Шунтирование (АКШ), замена клапанов, ангиопластика и детская кардиохирургия.",
          "Shuntlash (CABG), klapan almashtirish, angioplastika va bolalar yurak jarrohligi.",
        ),
        detail: l(
          "Coronary artery bypass grafting, valve repair and replacement, angioplasty and stenting, pacemaker implantation, and congenital and paediatric heart surgery at high-volume cardiac centres.",
          "Аортокоронарное шунтирование, восстановление и замена клапанов, ангиопластика и стентирование, имплантация кардиостимулятора, а также детская и врождённая кардиохирургия в центрах с большим потоком операций.",
          "Koronar shuntlash, klapanni tiklash va almashtirish, angioplastika va stentlash, kardiostimulyator implantatsiyasi hamda tug'ma va bolalar yurak jarrohligi yirik kardiologiya markazlarida.",
        ),
      },
      {
        slug: "oncology",
        icon: "🎗️",
        title: l("Oncology", "Онкология", "Onkologiya"),
        body: l(
          "Surgery, chemotherapy, radiation, CAR-T and proton therapy.",
          "Хирургия, химиотерапия, лучевая терапия, CAR-T и протонная терапия.",
          "Jarrohlik, kimyoterapiya, nurlanish, CAR-T va proton terapiyasi.",
        ),
        detail: l(
          "Tumour-board led care covering surgical oncology, medical oncology, radiotherapy, immunotherapy, CAR-T cell therapy, bone-marrow transplant and proton beam therapy.",
          "Лечение под руководством онкологического консилиума: хирургическая и лекарственная онкология, лучевая терапия, иммунотерапия, CAR-T терапия, трансплантация костного мозга и протонная терапия.",
          "Onkologik konsilium boshchiligidagi davolash: jarrohlik va dorivor onkologiya, nurlanish terapiyasi, immunoterapiya, CAR-T terapiyasi, ilik ko'chirish va proton terapiyasi.",
        ),
      },
      {
        slug: "orthopaedics",
        icon: "🦴",
        title: l("Orthopaedics", "Ортопедия", "Ortopediya"),
        body: l(
          "Knee & hip replacement, spine and complex orthopaedic surgery.",
          "Замена коленного и тазобедренного суставов, хирургия позвоночника и сложная ортопедия.",
          "Tizza va chanoq-son bo'g'imini almashtirish, umurtqa va murakkab ortopedik jarrohlik.",
        ),
        detail: l(
          "Total and partial knee replacement, hip replacement and revision surgery, robotic joint replacement, spine fusion and decompression, sports injuries and limb reconstruction.",
          "Полная и частичная замена коленного сустава, эндопротезирование и ревизия тазобедренного сустава, роботизированное эндопротезирование, спондилодез и декомпрессия позвоночника, спортивные травмы и реконструкция конечностей.",
          "To'liq va qisman tizza bo'g'imini almashtirish, chanoq-son bo'g'imi protezlash va revizion jarrohlik, robotli protezlash, umurtqa fiksatsiyasi va dekompressiyasi, sport jarohatlari va oyoq-qo'l rekonstruksiyasi.",
        ),
      },
      {
        slug: "neurosurgery",
        icon: "🧠",
        title: l("Neurosurgery", "Нейрохирургия", "Neyroxirurgiya"),
        body: l(
          "Brain tumour, deep brain stimulation, spinal fusion and stroke care.",
          "Опухоли мозга, глубокая стимуляция мозга, спондилодез и лечение инсульта.",
          "Miya o'smasi, chuqur miya stimulyatsiyasi, umurtqa fiksatsiyasi va insult davosi.",
        ),
        detail: l(
          "Brain and skull-base tumour surgery, awake craniotomy, deep brain stimulation for movement disorders, epilepsy surgery, complex spine procedures and acute stroke intervention.",
          "Хирургия опухолей мозга и основания черепа, краниотомия в сознании, глубокая стимуляция мозга при двигательных расстройствах, хирургия эпилепсии, сложные операции на позвоночнике и лечение острого инсульта.",
          "Miya va kalla suyagi asosidagi o'sma jarrohligi, hushdagi kraniotomiya, harakat buzilishlarida chuqur miya stimulyatsiyasi, epilepsiya jarrohligi, murakkab umurtqa amaliyotlari va o'tkir insult davosi.",
        ),
      },
      {
        slug: "organ-transplant",
        icon: "🫀",
        title: l("Organ transplant", "Трансплантация органов", "A'zo transplantatsiyasi"),
        body: l(
          "Kidney, liver, bone-marrow and heart transplant programmes.",
          "Программы трансплантации почки, печени, костного мозга и сердца.",
          "Buyrak, jigar, ilik va yurak transplantatsiyasi dasturlari.",
        ),
        detail: l(
          "Living-donor and deceased-donor kidney and liver transplant, paediatric transplant, bone-marrow and stem-cell transplant, and heart and lung transplant programmes with full donor workup.",
          "Трансплантация почки и печени от живого и посмертного донора, детская трансплантация, пересадка костного мозга и стволовых клеток, программы трансплантации сердца и лёгких с полным обследованием донора.",
          "Tirik va marhum donordan buyrak va jigar transplantatsiyasi, bolalar transplantatsiyasi, ilik va o'zak hujayra ko'chirish, yurak va o'pka transplantatsiyasi dasturlari to'liq donor tekshiruvi bilan.",
        ),
      },
      {
        slug: "fertility-ivf",
        icon: "👶",
        title: l("Fertility & IVF", "Репродуктология и ЭКО", "Reproduktologiya va EKO"),
        body: l(
          "Assisted reproduction and fertility treatment.",
          "Вспомогательные репродуктивные технологии и лечение бесплодия.",
          "Yordamchi reproduktiv texnologiyalar va bepushtlikni davolash.",
        ),
        detail: l(
          "IVF and ICSI cycles, fertility preservation, donor programmes, genetic screening of embryos, and treatment for male and female infertility with counselling throughout.",
          "Циклы ЭКО и ИКСИ, сохранение фертильности, донорские программы, генетический скрининг эмбрионов, лечение мужского и женского бесплодия с сопровождением специалиста.",
          "EKO va IKSI sikllari, fertillikni saqlash, donor dasturlari, embrionlarni genetik tekshirish, erkak va ayol bepushtligini davolash hamda maslahat.",
        ),
      },
    ],
  },

  aiPlanner: {
    eyebrow: l("Plan & estimate", "План и смета", "Reja va hisob"),
    title: l("Build your package, line by line", "Соберите пакет по пунктам", "Paketingizni bandma-band yarating"),
    body: l(
      "We read your reports and draft the complete journey — treatment, hospital stay, flights, accommodation, transfers and interpreter. Keep what you need, remove what you don't: the estimate recalculates as you go.",
      "Мы изучаем ваши документы и составляем весь маршрут — лечение, пребывание в клинике, перелёты, проживание, трансферы и переводчик. Оставьте нужное, уберите лишнее: смета пересчитывается на ходу.",
      "Hujjatlaringizni o'qib, butun safarni rejalashtiramiz — davolash, shifoxonada yotish, parvoz, turar joy, transfer va tarjimon. Keraklisini qoldiring, keraksizini olib tashlang: hisob darhol qayta hisoblanadi.",
    ),
    disclaimer: l(
      "AI does not replace a doctor. The plan is a starting point; diagnosis, treatment and the final price are confirmed by the treating specialist within 48 hours.",
      "ИИ не заменяет врача. План — это отправная точка; диагноз, лечение и окончательная цена подтверждаются лечащим специалистом в течение 48 часов.",
      "Sun'iy intellekt shifokor o'rnini bosmaydi. Reja — boshlang'ich nuqta; tashxis, davolash va yakuniy narx 48 soat ichida davolovchi mutaxassis tomonidan tasdiqlanadi.",
    ),
    packageTitle: l("Your draft package", "Ваш черновой пакет", "Sizning dastlabki paketingiz"),
    packageSubtitle: l("Generated from your reports", "Сформирован по вашим документам", "Hujjatlaringiz asosida tuzildi"),
    includedLabel: l("Included", "Включено", "Kiritilgan"),
    optionalLabel: l("Optional", "По желанию", "Ixtiyoriy"),
    totalLabel: l("Estimated total", "Ориентировочный итог", "Taxminiy jami"),
    totalNote: l(
      "Indicative figure — confirmed and guaranteed after doctor review",
      "Ориентировочная сумма — подтверждается и фиксируется после осмотра врача",
      "Taxminiy summa — shifokor ko'rigidan so'ng tasdiqlanadi va kafolatlanadi",
    ),
    cta: l("Start my plan", "Начать мой план", "Rejamni boshlash"),
    lines: [
      {
        id: "p1",
        icon: "stethoscope",
        title: l("Surgery & hospital stay", "Операция и пребывание в клинике", "Operatsiya va shifoxonada yotish"),
        note: l("10–14 days, twin-sharing room", "10–14 дней, двухместная палата", "10–14 kun, ikki kishilik xona"),
        amount: "$4,600",
        included: true,
        optional: false,
      },
      {
        id: "p2",
        icon: "clipboard",
        title: l("Pre-op tests & consultations", "Предоперационные обследования и консультации", "Operatsiyagacha tekshiruv va maslahatlar"),
        note: l("Included in the treatment package", "Входит в пакет лечения", "Davolash paketiga kiritilgan"),
        amount: "$320",
        included: true,
        optional: false,
      },
      {
        id: "p3",
        icon: "plane",
        title: l("Return flights", "Авиабилеты туда-обратно", "Borish-kelish aviachiptalari"),
        note: l("Two travellers, economy", "Два человека, эконом-класс", "Ikki yo'lovchi, ekonom sinf"),
        amount: "$740",
        included: true,
        optional: true,
      },
      {
        id: "p4",
        icon: "bed",
        title: l("Accommodation near hospital", "Проживание рядом с клиникой", "Shifoxona yaqinida turar joy"),
        note: l("12 nights, attendant included", "12 ночей, с сопровождающим", "12 kecha, hamroh bilan"),
        amount: "$430",
        included: true,
        optional: true,
      },
      {
        id: "p5",
        icon: "car",
        title: l("Airport & hospital transfers", "Трансферы аэропорт — клиника", "Aeroport va shifoxona transferlari"),
        note: l("All local travel during your stay", "Все местные поездки на время пребывания", "Turish davomidagi barcha mahalliy safarlar"),
        amount: "$60",
        included: true,
        optional: true,
      },
      {
        id: "p6",
        icon: "translate",
        title: l("Interpreter & in-app translator", "Переводчик и переводчик в приложении", "Tarjimon va ilovadagi tarjimon"),
        note: l("Free with every package", "Бесплатно в каждом пакете", "Har bir paketda bepul"),
        amount: "$0",
        included: true,
        optional: false,
      },
      {
        id: "p7",
        icon: "visa",
        title: l("Medical visa assistance", "Помощь с медицинской визой", "Tibbiy vizada yordam"),
        note: l("Invitation letter & documentation", "Приглашение и документы", "Taklifnoma va hujjatlar"),
        amount: "$0",
        included: true,
        optional: false,
      },
    ],
  },

  upload: {
    eyebrow: l("Not sure where to start?", "Не знаете, с чего начать?", "Nimadan boshlashni bilmayapsizmi?"),
    title: l(
      "Upload your reports, we'll take it from there",
      "Загрузите документы — дальше всё на нас",
      "Hujjatlaringizni yuklang — qolganini biz bajaramiz",
    ),
    body: l(
      "Send your medical reports and tell us what you need. Your plan and estimate are drafted straight away, and your own coordinator takes it from there.",
      "Отправьте медицинские документы и скажите, что вам нужно. План и смета будут готовы сразу, а дальше всем займётся ваш личный координатор.",
      "Tibbiy hujjatlaringizni yuboring va nima kerakligini ayting. Reja va hisob darhol tayyorlanadi, keyin shaxsiy koordinatoringiz ishni davom ettiradi.",
    ),
    dropTitle: l(
      "Drag reports here or click to browse",
      "Перетащите документы сюда или выберите файл",
      "Hujjatlarni shu yerga tashlang yoki tanlang",
    ),
    dropNote: l("Handled with care · kept private", "Обращаемся бережно · конфиденциально", "Ehtiyotkorlik bilan · maxfiy saqlanadi"),
    formats: ["PDF", "JPG", "PNG", "DICOM"],
  },

  tracker: {
    eyebrow: l("Your journey manager", "Ваш менеджер маршрута", "Safar menejeringiz"),
    title: l("We manage the whole journey", "Мы ведём весь маршрут", "Butun safarni biz boshqaramiz"),
    body: l(
      "One live case, tracked end to end — every team working from the same file.",
      "Одно живое дело, отслеживаемое от начала до конца — все команды работают с одним файлом.",
      "Bitta jonli ish boshidan oxirigacha kuzatiladi — barcha jamoalar bitta fayl bilan ishlaydi.",
    ),
    patientName: l("Sample patient", "Пример пациента", "Namuna bemor"),
    caseMeta: l(
      "Case #SHIN-1042 · Knee replacement",
      "Дело №SHIN-1042 · Замена коленного сустава",
      "Ish №SHIN-1042 · Tizza bo'g'imini almashtirish",
    ),
    currentLabel: l("Current", "Сейчас", "Hozir"),
    steps: [
      { id: "tk1", label: l("Enquiry", "Заявка", "So'rov"), state: "done" },
      { id: "tk2", label: l("Plan & estimate", "План и смета", "Reja va hisob"), state: "done" },
      { id: "tk3", label: l("Doctor opinion", "Мнение врача", "Shifokor xulosasi"), state: "done" },
      { id: "tk4", label: l("Hospital", "Клиника", "Shifoxona"), state: "done" },
      { id: "tk5", label: l("Visa & travel", "Виза и поездка", "Viza va safar"), state: "current" },
      { id: "tk6", label: l("Arrival", "Прибытие", "Kelish"), state: "todo" },
      { id: "tk7", label: l("Admission", "Госпитализация", "Gospitalizatsiya"), state: "todo" },
      { id: "tk8", label: l("Treatment", "Лечение", "Davolash"), state: "todo" },
      { id: "tk9", label: l("Recovery", "Восстановление", "Tiklanish"), state: "todo" },
      { id: "tk10", label: l("Follow-up", "Наблюдение", "Kuzatuv"), state: "todo" },
    ],
  },

  guarantee: {
    eyebrow: l("Our promises", "Наши обещания", "Bizning va'dalarimiz"),
    priceTitle: l("The price we confirm is the price you pay", "Подтверждённая цена — окончательная", "Tasdiqlangan narx — yakuniy narx"),
    priceBody: l(
      "Once the hospital confirms your plan, the price is locked. You are not charged extra during treatment — the only exception is a genuinely new medical finding discovered during care, and you are told about it before anything proceeds.",
      "После подтверждения плана клиникой цена фиксируется. Во время лечения доплат нет — единственное исключение — действительно новая медицинская находка, о которой вам сообщат до начала любых дополнительных действий.",
      "Shifoxona rejani tasdiqlagach, narx qat'iy bo'ladi. Davolash davomida qo'shimcha to'lov olinmaydi — yagona istisno davolash chog'ida aniqlangan haqiqatan yangi tibbiy holat bo'lib, bu haqda avvaldan xabar beriladi.",
    ),
    priceBadge: l("Guaranteed price", "Гарантированная цена", "Kafolatlangan narx"),
    translatorTitle: l("Speak to anyone, in your language", "Говорите с каждым на своём языке", "Har kim bilan o'z tilingizda gaplashing"),
    translatorBody: l(
      "The ShifaIn app carries a live translator. Point it at a doctor, a nurse, a pharmacist or a taxi driver and speak normally — you are understood, and you understand back. No hunting for an interpreter, no conversation you cannot follow.",
      "В приложении ShifaIn есть живой переводчик. Направьте его на врача, медсестру, фармацевта или водителя такси и говорите как обычно — вас поймут, и вы поймёте в ответ. Не нужно искать переводчика, не остаётся непонятых разговоров.",
      "ShifaIn ilovasida jonli tarjimon mavjud. Uni shifokor, hamshira, dorixonachi yoki taksi haydovchisiga qarating va odatdagidek gapiring — sizni tushunishadi, siz ham tushunasiz. Tarjimon qidirish shart emas, tushunarsiz suhbat qolmaydi.",
    ),
    translatorBadge: l("Built into the app", "Встроено в приложение", "Ilovaga o'rnatilgan"),
  },

  costs: {
    eyebrow: l("Transparent cost", "Прозрачная стоимость", "Shaffof narx"),
    title: l("Indicative treatment costs", "Ориентировочная стоимость лечения", "Davolashning taxminiy narxi"),
    body: l(
      "Starting-from estimates to help you plan. Your own figure is generated from your reports and guaranteed once the hospital confirms it.",
      "Цены «от» помогут вам спланировать. Ваша собственная сумма формируется по вашим документам и фиксируется после подтверждения клиникой.",
      "Rejalashtirish uchun «dan» narxlar. Sizning summangiz hujjatlaringiz asosida shakllanadi va shifoxona tasdiqlagach kafolatlanadi.",
    ),
    ctaLabel: l("Get my estimate", "Получить смету", "Hisobimni olish"),
    fromLabel: l("Starting from", "Начиная от", "Boshlang'ich narx"),
    footnote: l(
      "Illustrative estimates · figures vary by hospital, city and case",
      "Ориентировочные оценки · суммы зависят от клиники, города и случая",
      "Taxminiy baholar · summalar shifoxona, shahar va holatga qarab farqlanadi",
    ),
    items: [
      { id: "c1", icon: "🦵", title: l("Knee replacement", "Замена коленного сустава", "Tizza bo'g'imini almashtirish"), amount: "$4,000", note: l("10–14 days stay", "10–14 дней пребывания", "10–14 kun turish") },
      { id: "c2", icon: "🫀", title: l("Heart bypass (CABG)", "Коронарное шунтирование (АКШ)", "Yurak shuntlash (CABG)"), amount: "$4,500", note: l("12–16 days stay", "12–16 дней пребывания", "12–16 kun turish") },
      { id: "c3", icon: "🧠", title: l("Brain tumour surgery", "Операция при опухоли мозга", "Miya o'smasi operatsiyasi"), amount: "$5,000", note: l("14–21 days stay", "14–21 день пребывания", "14–21 kun turish") },
      { id: "c4", icon: "🩺", title: l("Kidney transplant", "Трансплантация почки", "Buyrak transplantatsiyasi"), amount: "$10,000", note: l("6–8 weeks stay", "6–8 недель пребывания", "6–8 hafta turish") },
    ],
  },

  hospitals: {
    eyebrow: l("Hospital network", "Сеть больниц", "Shifoxonalar tarmog'i"),
    title: l("India's leading accredited hospitals", "Ведущие аккредитованные клиники Индии", "Hindistonning yetakchi akkreditatsiyalangan shifoxonalari"),
    body: l(
      "A preview of the network — JCI & NABH accredited, with international patient desks.",
      "Обзор сети — аккредитация JCI и NABH, отделы для иностранных пациентов.",
      "Tarmoq bilan tanishing — JCI va NABH akkreditatsiyasi, xalqaro bemorlar bo'limi bilan.",
    ),
    bedsLabel: l("Beds", "Койки", "O'rinlar"),
    proceduresLabel: l("Procedures", "Процедуры", "Muolajalar"),
    ratingLabel: l("Rating", "Рейтинг", "Reyting"),
    viewLabel: l("View hospital", "Открыть клинику", "Shifoxonani ko'rish"),
    allLabel: l("View all 600+ hospitals", "Все 600+ клиник", "Barcha 600+ shifoxona"),
    items: [
      { id: "h1", name: "BLK-Max Super Speciality", city: "Delhi", tags: ["Oncology", "BMT", "Cardiac"], accreditations: ["JCI", "NABH"], beds: "650", procedures: "302", rating: "5.0" },
      { id: "h2", name: "Medanta – The Medicity", city: "Gurgaon", tags: ["Heart", "Transplant", "Neuro"], accreditations: ["JCI", "NABH"], beds: "1250", procedures: "281", rating: "4.6" },
      { id: "h3", name: "Indraprastha Apollo", city: "Delhi", tags: ["Transplant", "Cardiac", "Oncology"], accreditations: ["JCI"], beds: "710", procedures: "304", rating: "4.4" },
    ],
  },

  doctors: {
    eyebrow: l("Expert doctors", "Опытные врачи", "Tajribali shifokorlar"),
    title: l("Talk to a specialist before you decide", "Поговорите со специалистом до решения", "Qaror qilishdan avval mutaxassis bilan gaplashing"),
    body: l(
      "Book a video consult with senior specialists across India's top hospitals.",
      "Запишитесь на видеоконсультацию с ведущими специалистами клиник Индии.",
      "Hindistonning yetakchi shifoxonalari mutaxassislari bilan video maslahatga yoziling.",
    ),
    consultLabel: l("Video consult", "Видеоконсультация", "Video maslahat"),
    allLabel: l("Browse all doctors", "Все врачи", "Barcha shifokorlar"),
    items: [
      {
        id: "d1", initials: "AK", name: "Dr. Ajay Kaul", affiliation: "Fortis, Noida", experience: "38 yrs", fee: "$50",
        speciality: l("Cardiac Surgeon", "Кардиохирург", "Yurak jarrohi"),
        highlight: l("20,000+ heart procedures", "Более 20 000 операций на сердце", "20 000+ yurak amaliyoti"),
      },
      {
        id: "d2", initials: "SD", name: "Dr. Surender Dabas", affiliation: "Manipal, Delhi", experience: "22 yrs", fee: "$48",
        speciality: l("Surgical Oncologist", "Хирург-онколог", "Jarroh-onkolog"),
        highlight: l("Robotic head & neck surgery", "Роботизированная хирургия головы и шеи", "Bosh va bo'yin robot jarrohligi"),
      },
      {
        id: "d3", initials: "DG", name: "Dr. Dhananjay Gupta", affiliation: "Fortis, Delhi", experience: "20 yrs", fee: "$40",
        speciality: l("Orthopaedic Surgeon", "Ортопед-хирург", "Ortoped jarroh"),
        highlight: l("Hip & knee replacement", "Эндопротезирование бедра и колена", "Chanoq va tizza protezlash"),
      },
      {
        id: "d4", initials: "RG", name: "Dr. Rahul Gupta", affiliation: "Fortis, Noida", experience: "20 yrs", fee: "$36",
        speciality: l("Neuro & Spine Surgeon", "Нейрохирург и спинальный хирург", "Neyro va umurtqa jarrohi"),
        highlight: l("Spine & functional neurosurgery", "Спинальная и функциональная нейрохирургия", "Umurtqa va funksional neyroxirurgiya"),
      },
    ],
  },

  comparison: {
    eyebrow: l("Treatment comparison", "Сравнение вариантов", "Variantlarni taqqoslash"),
    title: l("Compare options before you travel", "Сравните варианты до поездки", "Safardan oldin variantlarni taqqoslang"),
    body: l(
      "See hospitals side by side. Illustrative estimates only.",
      "Сравните клиники рядом. Оценки ориентировочные.",
      "Shifoxonalarni yonma-yon ko'ring. Baholar taxminiy.",
    ),
    subject: l("Knee replacement", "Замена коленного сустава", "Tizza bo'g'imini almashtirish"),
    columns: ["BLK-Max · Delhi", "Medanta · Gurgaon", "Apollo · Delhi"],
    rows: [
      { id: "r1", label: l("Estimated cost (all-in)", "Ориентировочная стоимость (всё включено)", "Taxminiy narx (hammasi kiritilgan)"), values: ["$4,800", "$5,300", "$4,600"] },
      { id: "r2", label: l("Estimated hospital stay", "Ориентировочный срок в клинике", "Shifoxonada taxminiy turish"), values: ["10–14 days", "10–15 days", "10–14 days"] },
      { id: "r3", label: l("Accreditation", "Аккредитация", "Akkreditatsiya"), values: ["JCI · NABH", "JCI · NABH", "JCI"] },
      { id: "r4", label: l("In-app translator support", "Поддержка переводчика в приложении", "Ilovadagi tarjimon qo'llovi"), values: ["Yes", "Yes", "Yes"] },
      { id: "r5", label: l("Price guarantee", "Гарантия цены", "Narx kafolati"), values: ["Yes", "Yes", "Yes"] },
    ],
    footnote: l(
      "Illustrative estimates only. Final plans and costs are confirmed by the hospital after medical evaluation.",
      "Только ориентировочные оценки. Окончательные планы и стоимость подтверждаются клиникой после медицинской оценки.",
      "Faqat taxminiy baholar. Yakuniy reja va narx tibbiy baholashdan so'ng shifoxona tomonidan tasdiqlanadi.",
    ),
    cta: l("Request options", "Запросить варианты", "Variantlarni so'rash"),
  },

  services: {
    eyebrow: l("All included, free of charge", "Всё включено, бесплатно", "Hammasi kiritilgan, bepul"),
    title: l("Your case manager covers every need", "Ваш менеджер закрывает все вопросы", "Menejeringiz barcha masalani hal qiladi"),
    body: l(
      "Our services are free — and using them does not increase your hospital bill.",
      "Наши услуги бесплатны — и их использование не увеличивает счёт клиники.",
      "Xizmatlarimiz bepul — va ulardan foydalanish shifoxona hisobini oshirmaydi.",
    ),
    hubLabel: l("Case manager", "Менеджер дела", "Ish menejeri"),
    points: [
      { id: "sv1", icon: "clipboard", title: l("Medical opinion & estimates", "Медицинское мнение и смета", "Tibbiy xulosa va hisob"), body: l("Expert opinions and itemised cost estimates.", "Экспертные заключения и детальные сметы.", "Ekspert xulosalari va batafsil hisob-kitob.") },
      { id: "sv2", icon: "visa", title: l("Medical visa assistance", "Помощь с медицинской визой", "Tibbiy vizada yordam"), body: l("Documentation and invitation letters.", "Документы и приглашения.", "Hujjatlar va taklifnomalar.") },
      { id: "sv3", icon: "plane", title: l("Travel & airport transfers", "Перелёты и трансферы", "Safar va transferlar"), body: l("Flights and complimentary pickups.", "Авиабилеты и бесплатная встреча.", "Aviachiptalar va bepul kutib olish.") },
      { id: "sv4", icon: "translate", title: l("Interpreters & translation", "Переводчики и перевод", "Tarjimonlar va tarjima"), body: l("Human interpreters plus the in-app live translator.", "Живые переводчики и переводчик в приложении.", "Jonli tarjimonlar va ilovadagi tarjimon.") },
      { id: "sv5", icon: "bed", title: l("Accommodation", "Проживание", "Turar joy"), body: l("Near the hospital, matching your budget.", "Рядом с клиникой, по вашему бюджету.", "Shifoxona yaqinida, byudjetingizga mos.") },
      { id: "sv6", icon: "card", title: l("Money exchange & SIM", "Обмен валюты и SIM-карта", "Valyuta ayirboshlash va SIM") , body: l("Local currency and connectivity on arrival.", "Местная валюта и связь по прибытии.", "Kelganingizda mahalliy valyuta va aloqa.") },
    ],
  },

  whyIndia: {
    eyebrow: l("Why India", "Почему Индия", "Nega Hindiston"),
    title: l("Why patients choose India", "Почему пациенты выбирают Индию", "Nega bemorlar Hindistonni tanlaydi"),
    body: l(
      "Practical reasons patients travel for care — with realistic expectations, not guarantees.",
      "Практические причины поездки на лечение — с реалистичными ожиданиями, без обещаний.",
      "Davolanish uchun safar qilishning amaliy sabablari — va'dalarsiz, real kutilmalar bilan.",
    ),
    hubLabel: l("India", "Индия", "Hindiston"),
    points: [
      { id: "w1", icon: "spark", title: l("Advanced expertise", "Передовой опыт", "Ilg'or tajriba"), body: l("Experienced specialists and JCI/NABH tertiary-care hospitals.", "Опытные специалисты и клиники JCI/NABH третичного уровня.", "Tajribali mutaxassislar va JCI/NABH shifoxonalari.") },
      { id: "w2", icon: "card", title: l("Up to 50–80% savings", "Экономия до 50–80%", "50–80% gacha tejash"), body: l("High-quality treatment at a fraction of Western costs.", "Качественное лечение за долю западной стоимости.", "G'arb narxining bir qismiga sifatli davolash.") },
      { id: "w3", icon: "clock", title: l("No long waiting lists", "Без долгих очередей", "Uzoq navbat yo'q"), body: l("Appointments and surgery scheduled quickly.", "Приёмы и операции назначаются быстро.", "Qabul va operatsiyalar tez belgilanadi.") },
      { id: "w4", icon: "translate", title: l("Multilingual support", "Многоязычная поддержка", "Ko'p tilli qo'llab-quvvatlash"), body: l("Human interpreters and a live translator in the app.", "Живые переводчики и переводчик в приложении.", "Jonli tarjimonlar va ilovadagi tarjimon.") },
      { id: "w5", icon: "hospital", title: l("Broad options", "Широкий выбор", "Keng imkoniyatlar"), body: l("400+ procedures across every major speciality.", "Более 400 процедур по всем основным направлениям.", "Barcha yo'nalishlar bo'yicha 400+ muolaja.") },
      { id: "w6", icon: "home", title: l("Coordinated recovery", "Организованное восстановление", "Uyushtirilgan tiklanish"), body: l("Post-treatment stay and online follow-up back home.", "Восстановление после лечения и онлайн-наблюдение дома.", "Davolashdan keyingi turish va uyda onlayn kuzatuv.") },
    ],
  },

  partners: {
    eyebrow: l("For professionals", "Для специалистов", "Mutaxassislar uchun"),
    doctorTitle: l("Are you a doctor abroad?", "Вы врач за рубежом?", "Siz chet eldagi shifokormisiz?"),
    doctorBody: l(
      "Refer your patient to trusted hospitals in India and stay part of their treatment journey.",
      "Направьте пациента в проверенные клиники Индии и оставайтесь частью его лечения.",
      "Bemoringizni Hindistondagi ishonchli shifoxonalarga yo'llang va davolash jarayonida ishtirok eting.",
    ),
    doctorPoints: [
      { id: "dp1", label: l("Submit patient cases", "Отправляйте случаи пациентов", "Bemor holatlarini yuboring") },
      { id: "dp2", label: l("Upload reports", "Загружайте документы", "Hujjatlarni yuklang") },
      { id: "dp3", label: l("Request specialist opinions", "Запрашивайте мнение специалистов", "Mutaxassis fikrini so'rang") },
      { id: "dp4", label: l("Receive treatment options", "Получайте варианты лечения", "Davolash variantlarini oling") },
      { id: "dp5", label: l("Track the journey", "Отслеживайте маршрут", "Safarni kuzating") },
      { id: "dp6", label: l("Follow up after treatment", "Наблюдайте после лечения", "Davolashdan keyin kuzating") },
    ],
    doctorCta: l("Refer a patient", "Направить пациента", "Bemor yo'llash"),
    doctorLogin: l("Doctor login", "Вход для врачей", "Shifokor kirishi"),
    hospitalTitle: l("Are you a hospital in India?", "Вы клиника в Индии?", "Siz Hindistondagi shifoxonamisiz?"),
    hospitalBody: l(
      "Connect with international patients seeking specialised treatment in India.",
      "Получайте международных пациентов, которым нужно специализированное лечение в Индии.",
      "Hindistonda ixtisoslashgan davolanishni izlayotgan xalqaro bemorlar bilan bog'laning.",
    ),
    hospitalPoints: [
      { id: "hp1", label: l("Receive qualified enquiries", "Получайте проверенные заявки", "Tekshirilgan so'rovlarni oling") },
      { id: "hp2", label: l("Review medical cases", "Изучайте медицинские случаи", "Tibbiy holatlarni ko'rib chiqing") },
      { id: "hp3", label: l("Respond with plans", "Отвечайте планами лечения", "Davolash rejasini yuboring") },
      { id: "hp4", label: l("Provide estimates", "Предоставляйте сметы", "Hisob-kitob taqdim eting") },
      { id: "hp5", label: l("Manage international patients", "Ведите иностранных пациентов", "Xalqaro bemorlarni boshqaring") },
      { id: "hp6", label: l("Communicate with referrers", "Общайтесь с направляющими врачами", "Yo'llovchi shifokorlar bilan muloqot qiling") },
    ],
    hospitalCta: l("Partner with us", "Стать партнёром", "Hamkor bo'lish"),
    hospitalLogin: l("Hospital login", "Вход для клиник", "Shifoxona kirishi"),
  },

  stories: {
    eyebrow: l("Patient stories", "Истории пациентов", "Bemorlar hikoyalari"),
    title: l("Journeys we're proud of", "Маршруты, которыми мы гордимся", "Faxrlanadigan safarlarimiz"),
    body: l(
      "Placeholder stories for design only — not real patients; these will be replaced with verified reviews.",
      "Демонстрационные истории — не реальные пациенты; будут заменены проверенными отзывами.",
      "Namuna hikoyalar — haqiqiy bemorlar emas; tasdiqlangan sharhlar bilan almashtiriladi.",
    ),
    items: [
      {
        id: "st1", initials: "AK", name: "A. K.",
        from: l("Central Asia", "Центральная Азия", "Markaziy Osiyo"),
        treatment: l("Knee replacement", "Замена коленного сустава", "Tizza bo'g'imini almashtirish"),
        quote: l(
          "I uploaded my X-rays at night and had a full plan with costs before morning. Nothing changed at the hospital — the price stayed exactly as agreed.",
          "Я загрузил снимки вечером и уже к утру получил полный план со стоимостью. В клинике ничего не изменилось — цена осталась ровно такой, как договорились.",
          "Kechqurun rentgen suratlarimni yukladim, ertalabgacha to'liq reja va narxni oldim. Shifoxonada hech narsa o'zgarmadi — narx kelishilgandek qoldi.",
        ),
      },
      {
        id: "st2", initials: "MR", name: "M. R.",
        from: l("Middle East", "Ближний Восток", "Yaqin Sharq"),
        treatment: l("Cardiac bypass", "Коронарное шунтирование", "Yurak shuntlash"),
        quote: l(
          "The translator in the app meant I could ask the surgeon my own questions, in my own words, without waiting for anyone.",
          "Переводчик в приложении позволил задать хирургу свои вопросы своими словами, никого не дожидаясь.",
          "Ilovadagi tarjimon tufayli jarrohga savollarimni o'z so'zlarim bilan, hech kimni kutmasdan bera oldim.",
        ),
      },
      {
        id: "st3", initials: "NB", name: "N. B.",
        from: l("Africa", "Африка", "Afrika"),
        treatment: l("Oncology care", "Онкологическое лечение", "Onkologik davolash"),
        quote: l(
          "Visa, flights, hotel and the hospital admission were all arranged. I only had to send my reports and get on the plane.",
          "Виза, перелёт, отель и госпитализация — всё организовали. Мне оставалось только отправить документы и сесть в самолёт.",
          "Viza, parvoz, mehmonxona va gospitalizatsiya — hammasi tashkil qilindi. Menga faqat hujjat yuborish va samolyotga chiqish qoldi.",
        ),
      },
    ],
  },

  faq: {
    eyebrow: l("Questions", "Вопросы", "Savollar"),
    title: l("Frequently asked questions", "Часто задаваемые вопросы", "Ko'p so'raladigan savollar"),
    body: l(
      "Straight answers about how ShifaIn works.",
      "Прямые ответы о том, как работает ShifaIn.",
      "ShifaIn qanday ishlashi haqida aniq javoblar.",
    ),
    items: [
      {
        id: "f1",
        question: l("How fast is the estimate really?", "Насколько быстро готова смета?", "Hisob qanchalik tez tayyor bo'ladi?"),
        answer: l(
          "Minutes. As soon as your reports are uploaded, a draft plan and itemised estimate you can edit are ready. The treating hospital then confirms the final plan and price within 48 hours.",
          "Несколько минут. Как только документы загружены, готовы черновой план и детальная смета, которую можно менять. Затем клиника подтверждает окончательный план и цену в течение 48 часов.",
          "Bir necha daqiqa. Hujjatlar yuklangach, tahrirlash mumkin bo'lgan dastlabki reja va batafsil hisob tayyor bo'ladi. So'ngra shifoxona 48 soat ichida yakuniy reja va narxni tasdiqlaydi.",
        ),
      },
      {
        id: "f2",
        question: l("What does the price guarantee cover?", "Что покрывает гарантия цены?", "Narx kafolati nimani qamrab oladi?"),
        answer: l(
          "The confirmed treatment price. You will not be charged extra during treatment unless a new medical finding appears that was not visible in your reports — and you are told before any additional step is taken.",
          "Подтверждённую стоимость лечения. Во время лечения доплат не будет, кроме случая новой медицинской находки, которой не было в документах — и вас предупредят до любых дополнительных действий.",
          "Tasdiqlangan davolash narxini. Hujjatlarda ko'rinmagan yangi tibbiy holat aniqlanmasa, davolash chog'ida qo'shimcha to'lov olinmaydi — va har qanday qo'shimcha qadamdan oldin sizga xabar beriladi.",
        ),
      },
      {
        id: "f3",
        question: l("Can I remove flights or hotel from the package?", "Можно ли убрать перелёт или отель из пакета?", "Paketdan parvoz yoki mehmonxonani olib tashlash mumkinmi?"),
        answer: l(
          "Yes. Flights, accommodation, transfers and other travel items are optional — switch them off and the estimate updates immediately. Treatment items stay, because the hospital prices those.",
          "Да. Перелёты, проживание, трансферы и другие туристические позиции опциональны — отключите их, и смета обновится сразу. Медицинские позиции остаются, их стоимость определяет клиника.",
          "Ha. Parvoz, turar joy, transfer va boshqa safar bandlari ixtiyoriy — ularni o'chirsangiz hisob darhol yangilanadi. Tibbiy bandlar qoladi, chunki ularning narxini shifoxona belgilaydi.",
        ),
      },
      {
        id: "f4",
        question: l("Which countries do you serve?", "Какие страны вы обслуживаете?", "Qaysi davlatlarga xizmat ko'rsatasiz?"),
        answer: l(
          "Any country. ShifaIn is built for patients travelling to India from anywhere in the world, with language support in the app wherever you are.",
          "Любые. ShifaIn создан для пациентов, приезжающих в Индию из любой точки мира, с языковой поддержкой в приложении.",
          "Har qanday davlat. ShifaIn dunyoning istalgan nuqtasidan Hindistonga keladigan bemorlar uchun yaratilgan, ilovada til qo'llovi bilan.",
        ),
      },
      {
        id: "f5",
        question: l("Are your services really free?", "Ваши услуги действительно бесплатны?", "Xizmatlaringiz rostdan bepulmi?"),
        answer: l(
          "Yes. Planning, visa help, travel coordination, interpreters and follow-up are free, and using ShifaIn does not increase your hospital bill.",
          "Да. Планирование, помощь с визой, организация поездки, переводчики и последующее наблюдение бесплатны, а использование ShifaIn не увеличивает счёт клиники.",
          "Ha. Rejalashtirish, vizada yordam, safar tashkili, tarjimonlar va keyingi kuzatuv bepul, ShifaIn'dan foydalanish shifoxona hisobini oshirmaydi.",
        ),
      },
      {
        id: "f6",
        question: l("Do you guarantee treatment outcomes?", "Гарантируете ли вы результат лечения?", "Davolash natijasini kafolatlaysizmi?"),
        answer: l(
          "No. No platform or provider can guarantee medical outcomes. We guarantee the price we confirm — clinical decisions and prognoses belong to the treating doctors.",
          "Нет. Ни одна платформа или клиника не может гарантировать медицинский результат. Мы гарантируем подтверждённую цену — клинические решения и прогноз остаются за лечащими врачами.",
          "Yo'q. Hech bir platforma yoki klinika tibbiy natijani kafolatlay olmaydi. Biz tasdiqlangan narxni kafolatlaymiz — klinik qarorlar va prognoz davolovchi shifokorlarga tegishli.",
        ),
      },
    ],
  },

  closing: {
    title: l(
      "Your health journey to India, handled end to end.",
      "Ваш путь к лечению в Индии — под ключ.",
      "Hindistonga salomatlik safaringiz — to'liq xizmat.",
    ),
    body: l(
      "Send your reports and get a free plan and estimate right away — with a coordinator who speaks your language, every step of the way.",
      "Отправьте документы и сразу получите бесплатный план и смету — с координатором, говорящим на вашем языке, на каждом этапе.",
      "Hujjatlaringizni yuboring va bepul reja hamda hisobni darhol oling — har bosqichda o'z tilingizda gaplashadigan koordinator bilan.",
    ),
    primaryCta: l("Start your medical journey", "Начать медицинский маршрут", "Tibbiy safarni boshlash"),
    secondaryCta: l("Upload medical reports", "Загрузить документы", "Hujjatlarni yuklash"),
  },

  footer: {
    about: l(
      "ShifaIn plans and runs medical journeys to India — instant estimates, accredited hospitals, guaranteed prices and support in your language.",
      "ShifaIn планирует и сопровождает медицинские поездки в Индию — мгновенные сметы, аккредитованные клиники, гарантированные цены и поддержка на вашем языке.",
      "ShifaIn Hindistonga tibbiy safarlarni rejalashtiradi va yo'lga qo'yadi — tezkor hisob, akkreditatsiyalangan shifoxonalar, kafolatlangan narx va o'z tilingizda qo'llov.",
    ),
    disclaimer: l(
      "ShifaIn is a care-coordination platform, not a hospital or a medical provider. Nothing here is medical advice. Diagnosis, treatment and prognosis are decided by qualified healthcare professionals. Costs shown are indicative until confirmed by the treating hospital.",
      "ShifaIn — платформа координации лечения, а не больница и не медицинская организация. Материалы сайта не являются медицинской консультацией. Диагноз, лечение и прогноз определяют квалифицированные врачи. Указанные цены ориентировочны до подтверждения клиникой.",
      "ShifaIn — davolashni muvofiqlashtirish platformasi, shifoxona yoki tibbiy muassasa emas. Bu yerdagi ma'lumot tibbiy maslahat emas. Tashxis, davolash va prognozni malakali shifokorlar belgilaydi. Ko'rsatilgan narxlar shifoxona tasdiqlagunicha taxminiy.",
    ),
    copyright: l("© ShifaIn. All rights reserved.", "© ShifaIn. Все права защищены.", "© ShifaIn. Barcha huquqlar himoyalangan."),
    columns: [
      {
        id: "fc1",
        title: l("Patients", "Пациентам", "Bemorlarga"),
        links: [
          { id: "fl1", label: l("Get an estimate", "Получить смету", "Hisob olish"), href: "#quote" },
          { id: "fl2", label: l("Treatments", "Лечение", "Davolash"), href: "#specialties" },
          { id: "fl3", label: l("Hospitals", "Больницы", "Shifoxonalar"), href: "#hospitals" },
          { id: "fl4", label: l("Doctors", "Врачи", "Shifokorlar"), href: "#doctors" },
        ],
      },
      {
        id: "fc2",
        title: l("Professionals", "Специалистам", "Mutaxassislarga"),
        links: [
          { id: "fl5", label: l("Refer a patient", "Направить пациента", "Bemor yo'llash"), href: "#partners" },
          { id: "fl6", label: l("Doctor login", "Вход для врачей", "Shifokor kirishi"), href: "/portal/doctor" },
          { id: "fl7", label: l("Hospital login", "Вход для клиник", "Shifoxona kirishi"), href: "/portal/hospital" },
          { id: "fl8", label: l("Partner with us", "Стать партнёром", "Hamkor bo'lish"), href: "#partners" },
        ],
      },
      {
        id: "fc3",
        title: l("Company", "Компания", "Kompaniya"),
        links: [
          { id: "fl9", label: l("About ShifaIn", "О ShifaIn", "ShifaIn haqida"), href: "#" },
          { id: "fl10", label: l("Patient stories", "Истории пациентов", "Bemorlar hikoyalari"), href: "#stories" },
          { id: "fl11", label: l("Privacy policy", "Политика конфиденциальности", "Maxfiylik siyosati"), href: "#" },
          { id: "fl12", label: l("Terms of use", "Условия использования", "Foydalanish shartlari"), href: "#" },
        ],
      },
    ],
  },
};

/**
 * The defaults back every request, so nothing may edit them in place. Freezing
 * turns an accidental write into a loud failure instead of silent drift.
 */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

deepFreeze(defaultContent);
