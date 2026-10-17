import type { L, SiteContent } from "./content-types";
import { SECTION_IDS } from "./content-types";

/** Compact helper for authoring a localized string. */
const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

/**
 * The homepage, in order. Sections not listed stay in the code and can be
 * switched back on under Admin → Content; see docs/design/homepage.md for why
 * they are off by default (each repeated something said elsewhere).
 */
const HOMEPAGE_ORDER: string[] = [
  "hero",
  "stats",
  "specialties",
  "journey",
  "costs",
  "whyIndia",
  "hospitals",
  "stories",
  "faq",
  "closing",
  "partners",
];

const homepageSections = () =>
  Object.fromEntries(
    SECTION_IDS.map((id, i) => {
      const at = HOMEPAGE_ORDER.indexOf(id);
      return [id, { enabled: at >= 0, order: at >= 0 ? at : HOMEPAGE_ORDER.length + i }];
    }),
  ) as SiteContent["sections"];

export const defaultContent: SiteContent = {
  version: 1,
  updatedAt: "1970-01-01T00:00:00.000Z",

  brand: {
    name: "Shifain",
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

  sections: homepageSections(),

  hero: {
    // No badge above the headline; set one here and it appears.
    eyebrow: l("", "", ""),
    headline: l(
      "Your trusted medical journey to India",
      "Ваш надёжный путь к лечению в Индии",
      "Hindistonga ishonchli tibbiy safaringiz",
    ),
    headlineAccent: l("", "", ""),
    body: l(
      "Your partner for medical treatment in India, from your first consultation to your journey home.",
      "Ваш партнёр в лечении в Индии — от первой консультации до возвращения домой.",
      "Hindistonda davolanishda hamkoringiz — birinchi maslahatdan uyga qaytishgacha.",
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

  // The figures band is counted live from the catalogue (see Stats); nothing is typed in here.
  stats: { items: [] },

  usps: {
    eyebrow: l("Why Shifain", "Почему Shifain", "Nega Shifain"),
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
    eyebrow: l("How it works", "Как это работает", "Qanday ishlaydi"),
    title: l("How it works", "Как это работает", "Qanday ishlaydi"),
    body: l(
      "Four steps, with one coordinator who speaks your language from the first message to your follow-up at home.",
      "Четыре шага и один координатор, говорящий на вашем языке, — от первого сообщения до наблюдения дома.",
      "To'rt qadam va sizning tilingizda gaplashadigan bitta koordinator — birinchi xabardan uydagi kuzatuvgacha.",
    ),
    steps: [
      {
        id: "j1",
        icon: "upload",
        title: l("Share your reports", "Отправьте документы", "Hujjatlarni yuboring"),
        body: l(
          "Scans, test results or a doctor's letter, in any language — or describe the problem in the chat.",
          "Снимки, анализы или заключение врача на любом языке — или опишите проблему в чате.",
          "Tasvirlar, tahlillar yoki shifokor xulosasi istalgan tilda — yoki muammoni chatda yozing.",
        ),
      },
      {
        id: "j2",
        icon: "clipboard",
        title: l("Get your free plan", "Получите бесплатный план", "Bepul rejani oling"),
        body: l(
          "A draft treatment plan with an itemised estimate, usually within minutes.",
          "Черновик плана лечения с детальной сметой — обычно за несколько минут.",
          "Batafsil smetali davolash rejasi loyihasi — odatda bir necha daqiqada.",
        ),
      },
      {
        id: "j3",
        icon: "stethoscope",
        title: l("The hospital confirms", "Клиника подтверждает", "Shifoxona tasdiqlaydi"),
        body: l(
          "The treating specialist reviews your case and confirms the plan and price, normally within 48 hours.",
          "Лечащий специалист изучает случай и подтверждает план и цену — обычно в течение 48 часов.",
          "Davolovchi mutaxassis holatni ko'rib chiqib, reja va narxni odatda 48 soat ichida tasdiqlaydi.",
        ),
      },
      {
        id: "j4",
        icon: "plane",
        title: l("Travel and treatment", "Поездка и лечение", "Safar va davolanish"),
        body: l(
          "We arrange the visa letter, travel and stay, and stay with you until your follow-up at home.",
          "Мы готовим визовое письмо, поездку и проживание и остаёмся с вами до наблюдения дома.",
          "Viza xati, safar va turar joyni tashkil qilamiz va uydagi kuzatuvgacha siz bilan bo'lamiz.",
        ),
      },
    ],
    footnote: l("", "", ""),
  },

  specialties: {
    eyebrow: l("Treatment categories", "Направления лечения", "Davolash yo'nalishlari"),
    title: l("Find your treatment", "Выберите лечение", "Davolashni tanlang"),
    body: l(
      "Choose an area of care to see its treatments, typical stay and what to expect.",
      "Выберите направление, чтобы увидеть виды лечения, сроки и чего ожидать.",
      "Yo'nalishni tanlang — davolash turlari, odatiy muddat va nimani kutish kerakligini ko'ring.",
    ),
    linkLabel: l("Explore treatment", "Подробнее о лечении", "Davolash haqida batafsil"),
    items: [
      {
        slug: "cardiac-care",
        icon: "heart",
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
        icon: "ribbon",
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
        icon: "bone",
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
        icon: "brain",
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
        icon: "heart",
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
        icon: "baby",
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
      "The Shifain app carries a live translator. Point it at a doctor, a nurse, a pharmacist or a taxi driver and speak normally — you are understood, and you understand back. No hunting for an interpreter, no conversation you cannot follow.",
      "В приложении Shifain есть живой переводчик. Направьте его на врача, медсестру, фармацевта или водителя такси и говорите как обычно — вас поймут, и вы поймёте в ответ. Не нужно искать переводчика, не остаётся непонятых разговоров.",
      "Shifain ilovasida jonli tarjimon mavjud. Uni shifokor, hamshira, dorixonachi yoki taksi haydovchisiga qarating va odatdagidek gapiring — sizni tushunishadi, siz ham tushunasiz. Tarjimon qidirish shart emas, tushunarsiz suhbat qolmaydi.",
    ),
    translatorBadge: l("Built into the app", "Встроено в приложение", "Ilovaga o'rnatilgan"),
  },

  costs: {
    eyebrow: l("Transparent cost", "Прозрачная стоимость", "Shaffof narx"),
    title: l("What treatment costs", "Сколько стоит лечение", "Davolash qancha turadi"),
    body: l(
      "Starting prices to help you plan. Your own estimate is built from your reports.",
      "Цены «от» для планирования. Ваша смета строится по вашим документам.",
      "Rejalashtirish uchun boshlang'ich narxlar. Smetangiz hujjatlaringiz asosida tuziladi.",
    ),
    ctaLabel: l("Get my estimate", "Получить смету", "Hisobimni olish"),
    fromLabel: l("From", "От", "Narxi"),
    footnote: l(
      "Illustrative estimates · figures vary by hospital, city and case",
      "Ориентировочные оценки · суммы зависят от клиники, города и случая",
      "Taxminiy baholar · summalar shifoxona, shahar va holatga qarab farqlanadi",
    ),
    items: [
      { id: "c1", icon: "bone", title: l("Knee replacement", "Замена коленного сустава", "Tizza bo'g'imini almashtirish"), amount: "$4,000", note: l("10–14 days stay", "10–14 дней пребывания", "10–14 kun turish") },
      { id: "c2", icon: "heart", title: l("Heart bypass (CABG)", "Коронарное шунтирование (АКШ)", "Yurak shuntlash (CABG)"), amount: "$4,500", note: l("12–16 days stay", "12–16 дней пребывания", "12–16 kun turish") },
      { id: "c3", icon: "brain", title: l("Brain tumour surgery", "Операция при опухоли мозга", "Miya o'smasi operatsiyasi"), amount: "$5,000", note: l("14–21 days stay", "14–21 день пребывания", "14–21 kun turish") },
      { id: "c4", icon: "organ", title: l("Kidney transplant", "Трансплантация почки", "Buyrak transplantatsiyasi"), amount: "$10,000", note: l("6–8 weeks stay", "6–8 недель пребывания", "6–8 hafta turish") },
    ],
  },

  hospitals: {
    eyebrow: l("Hospital network", "Сеть больниц", "Shifoxonalar tarmog'i"),
    title: l("Hospitals and doctors", "Клиники и врачи", "Shifoxonalar va shifokorlar"),
    body: l(
      "Accredited hospitals with international patient desks — named here once they have signed with us.",
      "Аккредитованные клиники с международными отделами — появляются здесь после подписания договора с нами.",
      "Xalqaro bemorlar bo'limiga ega akkreditatsiyalangan shifoxonalar — biz bilan shartnoma imzolagach shu yerda paydo bo'ladi.",
    ),
    bedsLabel: l("Beds", "Койки", "O'rinlar"),
    proceduresLabel: l("Procedures", "Процедуры", "Muolajalar"),
    ratingLabel: l("Rating", "Рейтинг", "Reyting"),
    viewLabel: l("View hospital", "Открыть клинику", "Shifoxonani ko'rish"),
    allLabel: l("View all hospitals", "Все клиники", "Barcha shifoxonalar"),
    // Listed live from the catalogue: only hospitals and doctors with a signed tie-up and consent.
    items: [],
  },

  doctors: {
    eyebrow: l("Expert doctors", "Опытные врачи", "Tajribali shifokorlar"),
    title: l("Talk to a specialist before you decide", "Поговорите со специалистом до решения", "Qaror qilishdan avval mutaxassis bilan gaplashing"),
    body: l(
      "Specialists who have agreed to be listed, at the hospitals we work with.",
      "Специалисты, согласившиеся на публикацию, в клиниках, с которыми мы работаем.",
      "Ro'yxatga kiritilishga rozi bo'lgan mutaxassislar — biz ishlaydigan shifoxonalarda.",
    ),
    consultLabel: l("Video consult", "Видеоконсультация", "Video maslahat"),
    allLabel: l("Browse all doctors", "Все врачи", "Barcha shifokorlar"),
    // Listed live from the catalogue: only hospitals and doctors with a signed tie-up and consent.
    items: [],
  },

  comparison: {
    eyebrow: l("Treatment comparison", "Сравнение вариантов", "Variantlarni taqqoslash"),
    title: l("Compare options before you travel", "Сравните варианты до поездки", "Safardan oldin variantlarni taqqoslang"),
    body: l(
      "Your plan sets the hospitals that suit you side by side, like this example. Figures here are illustrative.",
      "Ваш план покажет подходящие клиники рядом — как в этом примере. Цифры здесь ориентировочные.",
      "Rejangiz sizga mos shifoxonalarni yonma-yon ko'rsatadi — bu misoldagidek. Bu yerdagi raqamlar taxminiy.",
    ),
    subject: l("Knee replacement", "Замена коленного сустава", "Tizza bo'g'imini almashtirish"),
    // An example only: hospitals are named on the site once they have signed with us.
    columns: ["Hospital A · Delhi", "Hospital B · Gurugram", "Hospital C · Chennai"],
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
    title: l("Why India, with Shifain", "Почему Индия — и почему с Shifain", "Nega Hindiston — va nega Shifain bilan"),
    body: l(
      "Accredited care at a fair price, without having to arrange it alone.",
      "Аккредитованное лечение по честной цене — и вам не нужно организовывать всё самим.",
      "Adolatli narxda akkreditatsiyalangan davolash — hammasini o'zingiz tashkil qilishingiz shart emas.",
    ),
    hubLabel: l("India", "Индия", "Hindiston"),
    points: [
      { id: "w1", icon: "shield", title: l("Price agreed before you fly", "Цена согласована до вылета", "Narx uchishdan oldin kelishiladi"), body: l("The hospital confirms your price before you travel. It changes only if doctors find something new, and you are told first.", "Клиника подтверждает цену до поездки. Она меняется, только если врачи найдут что-то новое, — и вам скажут заранее.", "Shifoxona narxni safardan oldin tasdiqlaydi. U faqat shifokorlar yangi narsa topsa o'zgaradi va sizga oldindan aytiladi.") },
      { id: "w2", icon: "translate", title: l("Your language, all the way", "Ваш язык — на каждом шаге", "Har qadamda o'z tilingiz"), body: l("A coordinator who speaks Uzbek, Russian or English, and a live translator for doctors and nurses.", "Координатор, говорящий на узбекском, русском или английском, и живой переводчик для разговора с врачами.", "O'zbek, rus yoki ingliz tilida gaplashadigan koordinator va shifokorlar bilan suhbat uchun jonli tarjimon.") },
      { id: "w3", icon: "hospital", title: l("Accredited hospitals", "Аккредитованные клиники", "Akkreditatsiyalangan shifoxonalar"), body: l("JCI and NABH accredited hospitals with international patient desks.", "Клиники с аккредитацией JCI и NABH и международными отделами.", "Xalqaro bemorlar bo'limiga ega JCI va NABH akkreditatsiyalangan shifoxonalar.") },
      { id: "w4", icon: "plane", title: l("Visa, travel and stay", "Виза, поездка и проживание", "Viza, safar va turar joy"), body: l("Visa invitation letter, flights, airport pickup and a stay near the hospital, arranged for you.", "Приглашение для визы, перелёт, встреча в аэропорту и жильё рядом с клиникой — всё организуем мы.", "Viza taklifnomasi, parvoz, aeroportdan kutib olish va shifoxona yaqinida turar joy — biz tashkil qilamiz.") },
      { id: "w5", icon: "card", title: l("Often far lower costs", "Часто намного дешевле", "Ko'pincha ancha arzon"), body: l("Accredited care often costs a fraction of the price in Europe or North America. Your estimate shows the real figure.", "Аккредитованное лечение часто в разы дешевле, чем в Европе или Северной Америке. Ваша смета покажет реальную цифру.", "Akkreditatsiyalangan davolash ko'pincha Yevropa yoki Shimoliy Amerikadagidan ancha arzon. Smetangiz haqiqiy narxni ko'rsatadi.") },
      { id: "w6", icon: "home", title: l("Follow-up at home", "Наблюдение дома", "Uyda kuzatuv"), body: l("Online check-ins with your doctor after you fly home.", "Онлайн-консультации с вашим врачом после возвращения домой.", "Uyga qaytgach shifokoringiz bilan onlayn uchrashuvlar.") },
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
    title: l("Patient stories", "Истории пациентов", "Bemorlar hikoyalari"),
    body: l(
      "Real journeys, told by the patients who made them.",
      "Настоящие истории — рассказанные самими пациентами.",
      "Haqiqiy safarlar — bemorlarning o'z so'zlari bilan.",
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
      "Straight answers about how Shifain works.",
      "Прямые ответы о том, как работает Shifain.",
      "Shifain qanday ishlashi haqida aniq javoblar.",
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
          "Any country. Shifain is built for patients travelling to India from anywhere in the world. We are starting with Uzbekistan, with Uzbek- and Russian-speaking coordinators, and the live translator covers many more languages.",
          "Любые. Shifain создан для пациентов, приезжающих в Индию со всего мира. Мы начинаем с Узбекистана — с координаторами, говорящими на узбекском и русском, а живой переводчик поддерживает многие другие языки.",
          "Har qanday davlat. Shifain dunyoning istalgan nuqtasidan Hindistonga keladigan bemorlar uchun yaratilgan. Biz O'zbekistondan boshlayapmiz — o'zbek va rus tilida gaplashadigan koordinatorlar bilan, jonli tarjimon esa yana ko'p tillarni qo'llaydi.",
        ),
      },
      {
        id: "f5",
        question: l("Are your services really free?", "Ваши услуги действительно бесплатны?", "Xizmatlaringiz rostdan bepulmi?"),
        answer: l(
          "Yes. Planning, visa help, travel coordination, interpreters and follow-up are free, and using Shifain does not increase your hospital bill.",
          "Да. Планирование, помощь с визой, организация поездки, переводчики и последующее наблюдение бесплатны, а использование Shifain не увеличивает счёт клиники.",
          "Ha. Rejalashtirish, vizada yordam, safar tashkili, tarjimonlar va keyingi kuzatuv bepul, Shifain'dan foydalanish shifoxona hisobini oshirmaydi.",
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
    title: l("Get your free treatment plan", "Получите бесплатный план лечения", "Bepul davolash rejasini oling"),
    body: l(
      "Tell us what you need in three short steps. A coordinator who speaks your language replies within 24 hours.",
      "Расскажите, что вам нужно, в три коротких шага. Координатор, говорящий на вашем языке, ответит в течение 24 часов.",
      "Nima kerakligini uchta qisqa qadamda ayting. Sizning tilingizda gaplashadigan koordinator 24 soat ichida javob beradi.",
    ),
    primaryCta: l("Prefer to talk? Chat with Shifain", "Хотите поговорить? Чат с Shifain", "Gaplashmoqchimisiz? Shifain bilan suhbat"),
    secondaryCta: l("WhatsApp us", "Написать в WhatsApp", "WhatsApp orqali yozish"),
  },

  footer: {
    about: l(
      "Shifain plans and runs medical journeys to India — instant estimates, accredited hospitals, guaranteed prices and support in your language.",
      "Shifain планирует и сопровождает медицинские поездки в Индию — мгновенные сметы, аккредитованные клиники, гарантированные цены и поддержка на вашем языке.",
      "Shifain Hindistonga tibbiy safarlarni rejalashtiradi va yo'lga qo'yadi — tezkor hisob, akkreditatsiyalangan shifoxonalar, kafolatlangan narx va o'z tilingizda qo'llov.",
    ),
    disclaimer: l(
      "Shifain is a care-coordination platform, not a hospital or a medical provider. Nothing here is medical advice. Diagnosis, treatment and prognosis are decided by qualified healthcare professionals. Costs shown are indicative until confirmed by the treating hospital.",
      "Shifain — платформа координации лечения, а не больница и не медицинская организация. Материалы сайта не являются медицинской консультацией. Диагноз, лечение и прогноз определяют квалифицированные врачи. Указанные цены ориентировочны до подтверждения клиникой.",
      "Shifain — davolashni muvofiqlashtirish platformasi, shifoxona yoki tibbiy muassasa emas. Bu yerdagi ma'lumot tibbiy maslahat emas. Tashxis, davolash va prognozni malakali shifokorlar belgilaydi. Ko'rsatilgan narxlar shifoxona tasdiqlagunicha taxminiy.",
    ),
    copyright: l("© Shifain. All rights reserved.", "© Shifain. Все права защищены.", "© Shifain. Barcha huquqlar himoyalangan."),
    columns: [
      {
        id: "fc1",
        title: l("Patients", "Пациентам", "Bemorlarga"),
        links: [
          { id: "fl1", label: l("Get an estimate", "Получить смету", "Hisob olish"), href: "#quote-form" },
          { id: "fl2", label: l("Treatments", "Лечение", "Davolash"), href: "#specialties" },
          { id: "fl3", label: l("Hospitals", "Больницы", "Shifoxonalar"), href: "#hospitals" },
          { id: "fl4", label: l("Doctors", "Врачи", "Shifokorlar"), href: "/doctors" },
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
          { id: "fl9", label: l("About Shifain", "О Shifain", "Shifain haqida"), href: "#about" },
          { id: "fl10", label: l("Questions & answers", "Вопросы и ответы", "Savol-javoblar"), href: "#faq" },
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
