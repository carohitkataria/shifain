import type { L } from "./content-types";

/** Every word of the patient portal, in the site's three languages. */
const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

export const PORTAL_NAV = {
  overview: l("Overview", "Обзор", "Umumiy"),
  plan: l("My plan", "Мой план", "Rejam"),
  reports: l("Reports & documents", "Документы", "Hujjatlar"),
  schedule: l("Schedule", "Расписание", "Jadval"),
  translator: l("Translator", "Переводчик", "Tarjimon"),
  history: l("History", "История", "Tarix"),
  help: l("Help", "Помощь", "Yordam"),
  profile: l("Profile", "Профиль", "Profil"),
} as const;

export type PortalSection = keyof typeof PORTAL_NAV;

export const PORTAL_COPY = {
  portalName: l("Your care space", "Ваше личное пространство", "Shaxsiy kabinetingiz"),
  caseLabel: l("Case", "Обращение", "Murojaat"),
  switchCase: l("Switch case", "Другое обращение", "Boshqa murojaat"),
  signOut: l("Sign out", "Выйти", "Chiqish"),
  referenceEnding: l("reference ending", "номер оканчивается на", "raqami tugaydi"),
  noCases: l(
    "You are signed in, but no case is linked to these details yet. Start one in a minute and it appears here.",
    "Вы вошли, но к этим данным пока не привязано обращение. Создайте его за минуту — оно появится здесь.",
    "Siz kirdingiz, lekin bu ma'lumotlarga hali murojaat bog'lanmagan. Bir daqiqada yarating — u shu yerda paydo bo'ladi.",
  ),
  startCase: l("Get my free plan", "Получить бесплатный план", "Bepul rejani olish"),

  // Overview
  hello: l("Hello", "Здравствуйте", "Assalomu alaykum"),
  overviewLead: l(
    "Everything about your treatment in one place: your plan, your reports, your calls and your coordinator.",
    "Всё о вашем лечении в одном месте: план, документы, звонки и координатор.",
    "Davolanishingiz haqida hammasi bir joyda: reja, hujjatlar, qo'ng'iroqlar va koordinator.",
  ),
  statusNow: l("Where your case is now", "Статус обращения", "Murojaatingiz holati"),
  nextStep: l("Your next step", "Следующий шаг", "Keyingi qadam"),
  journey: l("Your journey", "Ваш путь", "Sizning yo'lingiz"),
  quickLinks: l("What you can do here", "Что можно сделать здесь", "Bu yerda nima qilish mumkin"),
  coordinator: l("Your coordinator", "Ваш координатор", "Koordinatoringiz"),
  coordinatorBody: l(
    "A coordinator who speaks your language looks after your case and replies within 24 hours.",
    "Координатор, говорящий на вашем языке, ведёт ваше обращение и отвечает в течение 24 часов.",
    "Sizning tilingizda gapiradigan koordinator murojaatingizni olib boradi va 24 soat ichida javob beradi.",
  ),
  chatNow: l("Chat with Shifain", "Чат с Shifain", "Shifain bilan suhbat"),
  whatsapp: l("WhatsApp", "WhatsApp", "WhatsApp"),
  call: l("Call", "Позвонить", "Qo'ng'iroq"),
  email: l("Email", "Почта", "Pochta"),

  steps: {
    received: l("Case received", "Обращение получено", "Murojaat qabul qilindi"),
    plan: l("Draft plan & estimate", "Черновик плана и смета", "Reja loyihasi va smeta"),
    review: l("Coordinator review", "Проверка координатором", "Koordinator ko'rigi"),
    hospital: l("Hospital confirms", "Подтверждение клиники", "Shifoxona tasdig'i"),
    travel: l("Visa & travel", "Виза и поездка", "Viza va safar"),
    treatment: l("Treatment", "Лечение", "Davolanish"),
    home: l("Recovery & follow-up", "Восстановление и наблюдение", "Tiklanish va kuzatuv"),
  },
  stepDone: l("Done", "Готово", "Bajarildi"),
  stepNow: l("Now", "Сейчас", "Hozir"),
  stepLater: l("Coming up", "Впереди", "Keyingi"),

  next: {
    new: l(
      "We have your case. Add any reports you have — scans, test results, a doctor's letter — so the plan is built on them.",
      "Ваше обращение у нас. Добавьте документы, которые есть, — снимки, анализы, заключение врача, — чтобы план строился на них.",
      "Murojaatingiz bizda. Bor hujjatlarni qo'shing — tasvirlar, tahlillar, shifokor xulosasi — reja ularga asoslansin.",
    ),
    planning: l(
      "We are reading what you sent and preparing your draft plan. It usually takes a few minutes.",
      "Мы изучаем присланное и готовим черновик плана. Обычно это занимает несколько минут.",
      "Yuborganingizni o'rganib, reja loyihasini tayyorlayapmiz. Odatda bir necha daqiqa davom etadi.",
    ),
    planned: l(
      "Your draft plan is ready. Read it, change what you would like, and book a call if you have questions. A coordinator will review it with you.",
      "Черновик плана готов. Прочитайте его, измените что хотите и запишитесь на звонок, если есть вопросы. Координатор проверит его вместе с вами.",
      "Reja loyihasi tayyor. Uni o'qing, xohlaganingizni o'zgartiring va savollar bo'lsa, qo'ng'iroqqa yoziling. Koordinator uni siz bilan ko'rib chiqadi.",
    ),
    "plan-failed": l(
      "A coordinator is preparing your plan by hand and will contact you. Adding your reports helps them.",
      "Координатор готовит ваш план вручную и свяжется с вами. Добавленные документы ему помогут.",
      "Koordinator rejangizni qo'lda tayyorlamoqda va siz bilan bog'lanadi. Hujjatlaringiz unga yordam beradi.",
    ),
    confirmed: l(
      "The hospital has confirmed. Next come your visa letter, travel dates and arrival — your coordinator will guide each step.",
      "Клиника подтвердила. Дальше — визовое письмо, даты поездки и прибытие; координатор проведёт вас по каждому шагу.",
      "Shifoxona tasdiqladi. Keyin viza xati, safar sanalari va kelish — koordinator har bir qadamda yo'l ko'rsatadi.",
    ),
    closed: l(
      "This case is closed. If anything changes, start a new case or message us.",
      "Это обращение закрыто. Если что-то изменится, создайте новое или напишите нам.",
      "Bu murojaat yopilgan. Biror narsa o'zgarsa, yangisini oching yoki bizga yozing.",
    ),
  },
  nextAction: {
    new: l("Add reports", "Добавить документы", "Hujjat qo'shish"),
    planning: l("Add more reports", "Добавить документы", "Hujjat qo'shish"),
    planned: l("Review my plan", "Открыть план", "Rejani ko'rish"),
    "plan-failed": l("Add reports", "Добавить документы", "Hujjat qo'shish"),
    confirmed: l("Book a planning call", "Записаться на звонок", "Qo'ng'iroqqa yozilish"),
    closed: l("Get a new plan", "Новый план", "Yangi reja"),
  },

  features: {
    plan: l("Read your plan, estimate and day-by-day itinerary.", "План, смета и маршрут по дням.", "Reja, smeta va kunma-kun yo'nalish."),
    reports: l("Add scans and results; download what you sent.", "Добавляйте снимки и анализы, скачивайте отправленное.", "Tasvir va tahlillarni qo'shing, yuborganlaringizni yuklab oling."),
    schedule: l("Ask for a call with your coordinator, a doctor or an interpreter.", "Звонок с координатором, врачом или переводчиком.", "Koordinator, shifokor yoki tarjimon bilan qo'ng'iroq."),
    translator: l("Talk to anyone in India in your own language.", "Говорите с кем угодно в Индии на своём языке.", "Hindistonda istalgan kishi bilan o'z tilingizda gaplashing."),
    history: l("See everything that has happened on your case.", "Всё, что происходило с вашим обращением.", "Murojaatingiz bo'yicha barcha voqealar."),
    help: l("Answers, and a person when you need one.", "Ответы — и живой человек, когда нужно.", "Javoblar — va kerak bo'lsa, tirik odam."),
  },

  // Plan
  planTitle: l("Your draft plan", "Черновик вашего плана", "Reja loyihangiz"),
  planDraftNote: l(
    "Prepared automatically from what you told us. The treating doctor confirms the final plan and price after reviewing your case.",
    "Составлен автоматически по вашим данным. Окончательный план и цену подтверждает лечащий врач после изучения обращения.",
    "Siz bergan ma'lumotlar asosida avtomatik tuzilgan. Yakuniy reja va narxni davolovchi shifokor murojaatni ko'rib chiqib tasdiqlaydi.",
  ),
  planNone: l(
    "Your plan is not ready yet. As soon as it is, it appears here.",
    "План ещё не готов. Как только будет готов, он появится здесь.",
    "Reja hali tayyor emas. Tayyor bo'lishi bilan shu yerda paydo bo'ladi.",
  ),
  planOpen: l("Open full plan & estimate", "Открыть полный план и смету", "To'liq reja va smetani ochish"),
  understanding: l("What we understood", "Как мы поняли ваш случай", "Biz nimani tushundik"),
  recommended: l("Recommended treatment", "Рекомендуемое лечение", "Tavsiya etilgan davolash"),
  destination: l("Likely city", "Вероятный город", "Ehtimoliy shahar"),
  stay: l("Time in India", "Время в Индии", "Hindistonda qolish"),
  nights: l("nights in hospital", "ночей в клинике", "kecha shifoxonada"),
  days: l("days in total", "дней всего", "kun jami"),
  itinerary: l("Day by day", "По дням", "Kunma-kun"),
  services: l("Services in your package", "Услуги в вашем пакете", "Paketingizdagi xizmatlar"),
  questions: l("Questions for you", "Вопросы к вам", "Sizga savollar"),
  missing: l("Reports that would help", "Документы, которые помогут", "Yordam beradigan hujjatlar"),
  wishes: l("Your wishes", "Ваши пожелания", "Istaklaringiz"),
  wishCity: l("Preferred city", "Желаемый город", "Afzal shahar"),
  wishTravel: l("Travel dates", "Даты поездки", "Safar sanalari"),
  wishCompanions: l("Travelling with you", "Сопровождающие", "Hamrohlar"),
  notSet: l("Not set yet", "Пока не указано", "Hali belgilanmagan"),
  changeByChat: l(
    "To change any of these, tell Shifain in the chat — for example “add visa support” or “I'd like Delhi”.",
    "Чтобы изменить, скажите Shifain в чате — например, «добавь визовую поддержку» или «хочу в Дели».",
    "O'zgartirish uchun Shifain'ga chatda ayting — masalan, «viza yordamini qo'sh» yoki «Dehlini xohlayman».",
  ),

  // Reports
  reportsTitle: l("Reports & documents", "Медицинские документы", "Tibbiy hujjatlar"),
  reportsLead: l(
    "Scans, test results, discharge summaries and doctors' letters. The more we have, the more accurate your plan and price.",
    "Снимки, анализы, выписки и заключения врачей. Чем больше документов, тем точнее план и цена.",
    "Tasvirlar, tahlillar, ko'chirmalar va shifokor xulosalari. Hujjat qancha ko'p bo'lsa, reja va narx shunchalik aniq.",
  ),
  uploadTitle: l("Add reports", "Добавить документы", "Hujjat qo'shish"),
  uploadHint: l(
    "PDF, JPG or PNG — up to five files and 30 MB at a time.",
    "PDF, JPG или PNG — до пяти файлов и 30 МБ за раз.",
    "PDF, JPG yoki PNG — bir martada beshtagacha fayl va 30 MB gacha.",
  ),
  uploadButton: l("Upload", "Загрузить", "Yuklash"),
  uploaded: l("Received — your coordinator can see them now.", "Получено — координатор уже их видит.", "Qabul qilindi — koordinator ularni ko'ra oladi."),
  uploadFailed: l(
    "Those files could not be added. Check the type and size and try again.",
    "Не удалось добавить файлы. Проверьте тип и размер и попробуйте снова.",
    "Fayllarni qo'shib bo'lmadi. Turi va hajmini tekshirib, qayta urinib ko'ring.",
  ),
  reportsNone: l("No reports yet.", "Документов пока нет.", "Hozircha hujjat yo'q."),
  keptUntil: l("Kept until", "Хранится до", "Saqlanadi"),
  notStored: l("Not stored", "Не сохранён", "Saqlanmagan"),
  openFile: l("Open", "Открыть", "Ochish"),
  downloadFile: l("Download", "Скачать", "Yuklab olish"),
  privacyTitle: l("Your files stay private", "Ваши файлы конфиденциальны", "Fayllaringiz maxfiy"),
  privacyBody: l(
    "Only you and your coordinator can open them. They are deleted automatically after the date shown, or now if you ask.",
    "Открыть их можете только вы и ваш координатор. Они удаляются автоматически после указанной даты — или сразу, по вашей просьбе.",
    "Ularni faqat siz va koordinatoringiz ocha oladi. Ko'rsatilgan sanadan keyin avtomatik o'chiriladi — yoki so'rasangiz, darhol.",
  ),
  deleteReports: l("Delete my files now", "Удалить мои файлы сейчас", "Fayllarimni hozir o'chirish"),
  deleteConfirm: l(
    "Yes, delete every stored file on this case",
    "Да, удалить все файлы этого обращения",
    "Ha, bu murojaatdagi barcha fayllarni o'chirish",
  ),
  deleted: l("Your files have been deleted.", "Ваши файлы удалены.", "Fayllaringiz o'chirildi."),

  // Schedule
  scheduleTitle: l("Schedule a call", "Запись на звонок", "Qo'ng'iroqqa yozilish"),
  scheduleLead: l(
    "Pick a day and a time of day that suits you. Your coordinator confirms the exact time with you — until then it shows as requested.",
    "Выберите день и удобное время суток. Координатор согласует с вами точное время — до этого запись помечена как запрошенная.",
    "Kun va qulay vaqtni tanlang. Koordinator aniq vaqtni siz bilan kelishadi — shungacha so'rov sifatida ko'rinadi.",
  ),
  kind: l("Who would you like to talk to?", "С кем хотите поговорить?", "Kim bilan gaplashmoqchisiz?"),
  kinds: {
    coordinator: l("My coordinator (video or phone)", "С координатором (видео или телефон)", "Koordinator bilan (video yoki telefon)"),
    doctor: l("The treating doctor (teleconsultation)", "С лечащим врачом (телеконсультация)", "Davolovchi shifokor bilan (telekonsultatsiya)"),
    interpreter: l("An interpreter, for a call with the hospital", "С переводчиком, для разговора с клиникой", "Tarjimon bilan, shifoxona bilan suhbat uchun"),
  },
  date: l("Preferred day", "Желаемый день", "Afzal kun"),
  window: l("Time of day", "Время суток", "Kun vaqti"),
  windows: {
    morning: l("Morning (9–12)", "Утро (9–12)", "Ertalab (9–12)"),
    afternoon: l("Afternoon (12–17)", "День (12–17)", "Kunduzi (12–17)"),
    evening: l("Evening (17–20)", "Вечер (17–20)", "Kechqurun (17–20)"),
  },
  yourTime: l("in your time zone", "по вашему времени", "sizning vaqtingiz bo'yicha"),
  language: l("Language for the call", "Язык разговора", "Suhbat tili"),
  note: l("Anything we should know (optional)", "Что нам нужно знать (необязательно)", "Bilishimiz kerak bo'lgan narsa (ixtiyoriy)"),
  request: l("Request this call", "Запросить звонок", "Qo'ng'iroqni so'rash"),
  requested: l("Request sent. Your coordinator will confirm the time.", "Запрос отправлен. Координатор подтвердит время.", "So'rov yuborildi. Koordinator vaqtni tasdiqlaydi."),
  requestFailed: l("Choose a day from tomorrow onwards and try again.", "Выберите день начиная с завтрашнего и попробуйте снова.", "Ertangi kundan boshlab kun tanlang va qayta urinib ko'ring."),
  yourCalls: l("Your calls", "Ваши звонки", "Qo'ng'iroqlaringiz"),
  callsNone: l("No calls yet.", "Звонков пока нет.", "Hozircha qo'ng'iroq yo'q."),
  callStatus: {
    requested: l("Requested — waiting for confirmation", "Запрошено — ждёт подтверждения", "So'ralgan — tasdiq kutilmoqda"),
    confirmed: l("Confirmed", "Подтверждено", "Tasdiqlangan"),
    declined: l("Not possible — your coordinator will suggest another time", "Не получилось — координатор предложит другое время", "Imkon bo'lmadi — koordinator boshqa vaqt taklif qiladi"),
    cancelled: l("Cancelled", "Отменено", "Bekor qilingan"),
  },
  cancel: l("Cancel request", "Отменить", "Bekor qilish"),
  travelPlans: l("Travel dates", "Даты поездки", "Safar sanalari"),

  // Translator
  translatorTitle: l("Live translator", "Живой переводчик", "Jonli tarjimon"),
  translatorLead: l(
    "Talking to a doctor, a nurse or a driver in India? Choose your language and theirs, then take turns speaking or typing. Each line is translated and read aloud.",
    "Говорите с врачом, медсестрой или водителем в Индии? Выберите свой язык и язык собеседника и говорите или пишите по очереди. Каждая фраза переводится и озвучивается.",
    "Hindistonda shifokor, hamshira yoki haydovchi bilan gaplashyapsizmi? O'z tilingiz va suhbatdosh tilini tanlang, navbat bilan gapiring yoki yozing. Har bir gap tarjima qilinib, ovoz chiqarib o'qiladi.",
  ),
  iSpeak: l("I speak", "Я говорю на", "Men gapiraman"),
  theySpeak: l("They speak", "Собеседник говорит на", "Suhbatdosh gapiradi"),
  me: l("Me", "Я", "Men"),
  them: l("Them", "Собеседник", "Suhbatdosh"),
  typeHere: l("Type, or tap the microphone", "Напишите или нажмите на микрофон", "Yozing yoki mikrofonni bosing"),
  translate: l("Translate", "Перевести", "Tarjima"),
  listening: l("Listening…", "Слушаю…", "Tinglayapman…"),
  readAloud: l("Read translations aloud", "Озвучивать перевод", "Tarjimani ovoz chiqarib o'qish"),
  swap: l("Swap languages", "Поменять языки", "Tillarni almashtirish"),
  clear: l("Clear", "Очистить", "Tozalash"),
  translating: l("Translating…", "Перевожу…", "Tarjima qilinmoqda…"),
  translateFailed: l(
    "That could not be translated just now. Please try again.",
    "Сейчас не удалось перевести. Попробуйте ещё раз.",
    "Hozir tarjima qilib bo'lmadi. Qayta urinib ko'ring.",
  ),
  translatorEmpty: l(
    "Your conversation appears here. Hand the phone to the other person when it is their turn.",
    "Здесь появится разговор. Передайте телефон собеседнику, когда его очередь.",
    "Suhbat shu yerda paydo bo'ladi. Navbati kelganda telefonni suhbatdoshga bering.",
  ),
  translatorCaution: l(
    "Machine translation can make mistakes. For consent forms, diagnoses and anything about medicines, ask for a human interpreter.",
    "Машинный перевод может ошибаться. Для согласий, диагнозов и всего, что касается лекарств, попросите живого переводчика.",
    "Mashina tarjimasi xato qilishi mumkin. Rozilik shakllari, tashxis va dorilar uchun tirik tarjimon so'rang.",
  ),
  bookInterpreter: l("Book a human interpreter", "Заказать живого переводчика", "Tirik tarjimon chaqirish"),
  speak: l("Speak", "Говорить", "Gapirish"),
  play: l("Play", "Озвучить", "Eshittirish"),

  // History
  historyTitle: l("History", "История", "Tarix"),
  historyLead: l("Everything that has happened on your case, newest first.", "Всё, что происходило с обращением, — сначала новое.", "Murojaat bo'yicha barcha voqealar — avval yangilari."),
  historyEvents: {
    created: l("Case opened", "Обращение открыто", "Murojaat ochildi"),
    reports: l("Reports received", "Документы получены", "Hujjatlar qabul qilindi"),
    planned: l("Draft plan prepared", "Черновик плана готов", "Reja loyihasi tayyorlandi"),
    replan: l("Plan updated on request", "План обновлён по запросу", "Reja so'rov bo'yicha yangilandi"),
    change: l("You changed your plan", "Вы изменили план", "Rejani o'zgartirdingiz"),
    note: l("You added details", "Вы добавили сведения", "Ma'lumot qo'shdingiz"),
    call: l("Call requested", "Запрошен звонок", "Qo'ng'iroq so'raldi"),
    confirmed: l("Hospital confirmed", "Клиника подтвердила", "Shifoxona tasdiqladi"),
  },
  via: {
    chat: l("by chat", "через чат", "chat orqali"),
    voice: l("by voice", "голосом", "ovoz bilan"),
    portal: l("here", "здесь", "shu yerda"),
    coordinator: l("by your coordinator", "координатором", "koordinator tomonidan"),
  },

  // Help
  helpTitle: l("Help", "Помощь", "Yordam"),
  helpLead: l(
    "Quick answers first. If yours is not here, a person is one tap away.",
    "Сначала быстрые ответы. Если вашего нет — живой человек в одном касании.",
    "Avval tezkor javoblar. Sizniki yo'q bo'lsa — tirik odam bir bosishda.",
  ),
  talkToPerson: l("Talk to a person", "Связаться с человеком", "Odam bilan gaplashish"),
  emergency: l(
    "In an emergency, call your local emergency number or go to the nearest emergency department. Shifain is not an emergency service.",
    "В экстренной ситуации звоните в местную службу спасения или идите в ближайшее приёмное отделение. Shifain — не экстренная служба.",
    "Favqulodda holatda mahalliy tez yordam raqamiga qo'ng'iroq qiling yoki eng yaqin shoshilinch bo'limga boring. Shifain favqulodda xizmat emas.",
  ),
  faqs: [
    {
      q: l("How long until I get my plan?", "Когда будет готов план?", "Reja qachon tayyor bo'ladi?"),
      a: l(
        "A draft plan usually appears within minutes of your reports arriving. The treating hospital confirms the final plan and price, normally within 48 hours.",
        "Черновик обычно появляется через несколько минут после получения документов. Клиника подтверждает окончательный план и цену, как правило, в течение 48 часов.",
        "Reja loyihasi odatda hujjatlar kelgach bir necha daqiqada paydo bo'ladi. Yakuniy reja va narxni shifoxona odatda 48 soat ichida tasdiqlaydi.",
      ),
    },
    {
      q: l("Is the estimate the final price?", "Смета — это окончательная цена?", "Smeta yakuniy narxmi?"),
      a: l(
        "No. It is an itemised estimate from the hospitals' published rates. The final price is the one the treating hospital confirms after reviewing your reports.",
        "Нет. Это детальная смета по опубликованным ценам клиник. Окончательная цена — та, которую подтвердит клиника после изучения документов.",
        "Yo'q. Bu shifoxonalarning e'lon qilingan narxlari bo'yicha batafsil smeta. Yakuniy narxni shifoxona hujjatlarni ko'rib chiqib tasdiqlaydi.",
      ),
    },
    {
      q: l("Who can see my reports?", "Кто видит мои документы?", "Hujjatlarimni kim ko'radi?"),
      a: l(
        "Only you, your coordinator and, once you choose one, the treating hospital. Files are deleted automatically after the retention period, or straight away if you ask.",
        "Только вы, ваш координатор и — после вашего выбора — клиника. Файлы удаляются автоматически по истечении срока хранения или сразу по вашей просьбе.",
        "Faqat siz, koordinatoringiz va — siz tanlagach — shifoxona. Fayllar saqlash muddati tugagach avtomatik yoki so'rovingiz bilan darhol o'chiriladi.",
      ),
    },
    {
      q: l("Do you help with the visa?", "Помогаете с визой?", "Viza bilan yordam berasizmi?"),
      a: l(
        "Yes. Once the hospital confirms, it issues the invitation letter for a medical visa, and your coordinator walks you through the application.",
        "Да. После подтверждения клиника выдаёт приглашение для медицинской визы, а координатор помогает с подачей.",
        "Ha. Shifoxona tasdiqlagach, tibbiy viza uchun taklifnoma beradi, koordinator esa ariza topshirishda yordam beradi.",
      ),
    },
    {
      q: l("I don't speak English. Is that a problem?", "Я не говорю по-английски. Это проблема?", "Ingliz tilini bilmayman. Muammo bo'ladimi?"),
      a: l(
        "No. Your coordinator speaks your language, the live translator here works in many languages, and a human interpreter can join calls and hospital visits.",
        "Нет. Координатор говорит на вашем языке, переводчик здесь работает на многих языках, а живой переводчик может присоединиться к звонкам и визитам в клинику.",
        "Yo'q. Koordinator sizning tilingizda gapiradi, bu yerdagi tarjimon ko'p tillarda ishlaydi, tirik tarjimon esa qo'ng'iroqlar va shifoxona tashriflariga qo'shila oladi.",
      ),
    },
    {
      q: l("How do I pay?", "Как оплачивать?", "Qanday to'layman?"),
      a: l(
        "You never pay through a chat or an unknown link. Payment terms come with the hospital's confirmed plan, and your coordinator explains them before anything is due.",
        "Вы никогда не платите через чат или неизвестную ссылку. Условия оплаты приходят вместе с подтверждённым планом клиники, и координатор объяснит их заранее.",
        "Hech qachon chat yoki noma'lum havola orqali to'lamaysiz. To'lov shartlari shifoxona tasdiqlagan reja bilan keladi, koordinator ularni oldindan tushuntiradi.",
      ),
    },
  ],

  // Profile
  profileTitle: l("Profile", "Профиль", "Profil"),
  profileLead: l(
    "The details on your case. To change any of them, tell your coordinator or Shifain in the chat.",
    "Данные вашего обращения. Чтобы изменить их, скажите координатору или Shifain в чате.",
    "Murojaatingizdagi ma'lumotlar. O'zgartirish uchun koordinatorga yoki chatda Shifain'ga ayting.",
  ),
  name: l("Name", "Имя", "Ism"),
  phone: l("Phone", "Телефон", "Telefon"),
  country: l("Country", "Страна", "Davlat"),
  emailAddress: l("Email", "Почта", "Pochta"),
  caseLanguage: l("Language", "Язык", "Til"),
  signedInWith: l("Signed in with", "Вход выполнен через", "Kirish usuli"),
  allCases: l("All your cases", "Все ваши обращения", "Barcha murojaatlaringiz"),
  opened: l("Opened", "Открыто", "Ochilgan"),
};

export const LOGIN_COPY = {
  title: l("Your treatment, in one place", "Ваше лечение — в одном месте", "Davolanishingiz — bir joyda"),
  lead: l(
    "Sign in to see your plan, add reports, book calls and talk to anyone in India in your own language.",
    "Войдите, чтобы видеть план, добавлять документы, записываться на звонки и говорить с кем угодно в Индии на своём языке.",
    "Rejangizni ko'rish, hujjat qo'shish, qo'ng'iroqqa yozilish va Hindistonda istalgan kishi bilan o'z tilingizda gaplashish uchun kiring.",
  ),
  insideTitle: l("Inside your care space", "В личном пространстве", "Shaxsiy kabinetda"),
  cardTitle: l("Sign in", "Вход", "Kirish"),
  cardLead: l("No password needed.", "Пароль не нужен.", "Parol kerak emas."),
  withEmail: l("Email code", "Код на почту", "Pochtaga kod"),
  withReference: l("Case reference", "Номер обращения", "Murojaat raqami"),
  google: l("Continue with Google", "Войти через Google", "Google orqali kirish"),
  or: l("or", "или", "yoki"),
  codeSentTo: l("We sent a code to", "Мы отправили код на", "Kod yuborildi:"),
  newHere: l("New to Shifain?", "Впервые в Shifain?", "Shifain'da yangimisiz?"),
  newHereBody: l(
    "Create your account with a few details. You can start a case now or whenever you are ready.",
    "Создайте аккаунт за минуту. Обращение можно открыть сразу или когда будете готовы.",
    "Bir necha ma'lumot bilan akkaunt yarating. Murojaatni hozir yoki tayyor bo'lganingizda ochishingiz mumkin.",
  ),
  createAccount: l("Create an account", "Создать аккаунт", "Akkaunt yaratish"),
  orPlan: l("Or get a free plan without an account", "Или получите бесплатный план без аккаунта", "Yoki akkauntsiz bepul reja oling"),
  haveAccount: l("Already have an account?", "Уже есть аккаунт?", "Akkauntingiz bormi?"),
  signInLink: l("Sign in", "Войти", "Kirish"),
  languages: l(
    "Available in English, Русский and O'zbek, with a translator for many more.",
    "Доступно на English, Русском и O'zbek, а переводчик — на многих других.",
    "English, Русский va O'zbek tillarida, tarjimon esa yana ko'p tillarda.",
  ),
};

export const SIGNUP_COPY = {
  title: l("Create your Shifain account", "Создайте аккаунт Shifain", "Shifain akkauntini yarating"),
  lead: l(
    "A few details and a code from your email — that is all. Start a case now, or come back whenever you are ready.",
    "Несколько данных и код из письма — вот и всё. Откройте обращение сейчас или вернитесь, когда будете готовы.",
    "Bir necha ma'lumot va pochtangizdagi kod — shu xolos. Murojaatni hozir oching yoki tayyor bo'lganingizda qayting.",
  ),
  cardTitle: l("Sign up", "Регистрация", "Ro'yxatdan o'tish"),
  cardLead: l("No password. We verify your email with a code.", "Без пароля. Почту подтверждаем кодом.", "Parolsiz. Pochtangizni kod bilan tasdiqlaymiz."),
  firstName: l("First name", "Имя", "Ism"),
  lastName: l("Last name", "Фамилия", "Familiya"),
  country: l("Country you live in", "Страна проживания", "Yashash mamlakati"),
  countryPick: l("Choose your country", "Выберите страну", "Mamlakatni tanlang"),
  phone: l("Phone or WhatsApp", "Телефон или WhatsApp", "Telefon yoki WhatsApp"),
  dial: l("Country code", "Код страны", "Mamlakat kodi"),
  email: l("Email address", "Электронная почта", "Elektron pochta"),
  emailHint: l("We send a six-digit code here to verify it.", "Сюда придёт шестизначный код для подтверждения.", "Tasdiqlash uchun bu yerga olti xonali kod yuboramiz."),
  agree: l(
    "I agree to Shifain keeping these details to contact me and plan my treatment.",
    "Я согласен(на), чтобы Shifain хранил эти данные, чтобы связаться со мной и спланировать лечение.",
    "Shifain bu ma'lumotlarni men bilan bog'lanish va davolanishimni rejalashtirish uchun saqlashiga roziman.",
  ),
  submit: l("Send my code", "Отправить код", "Kodni yuborish"),
  codeSent: l(
    "We emailed a six-digit code to",
    "Мы отправили шестизначный код на",
    "Olti xonali kod yuborildi:",
  ),
  codeNote: l(
    "Enter it below to finish. It works for 15 minutes. Check your spam folder if it has not arrived in a minute.",
    "Введите его ниже, чтобы завершить. Он действует 15 минут. Если письма нет через минуту, проверьте «Спам».",
    "Yakunlash uchun uni quyida kiriting. U 15 daqiqa amal qiladi. Bir daqiqada kelmasa, «Spam» papkasini tekshiring.",
  ),
  verify: l("Verify and create my account", "Подтвердить и создать аккаунт", "Tasdiqlash va akkaunt yaratish"),
  detailsError: l(
    "Please fill in your first name, country, phone and a full email address, and tick the agreement.",
    "Заполните имя, страну, телефон и полный адрес почты и отметьте согласие.",
    "Ism, mamlakat, telefon va to'liq pochta manzilini kiriting hamda roziligingizni belgilang.",
  ),
  startOver: l("Change my details", "Изменить данные", "Ma'lumotlarni o'zgartirish"),
};

export const ACCOUNT_COPY = {
  welcome: l("Welcome to Shifain", "Добро пожаловать в Shifain", "Shifain'ga xush kelibsiz"),
  ready: l(
    "Your account is ready. Whenever you are, start a case: tell us what you need and send any reports, and we draft your free treatment plan.",
    "Ваш аккаунт готов. Когда будете готовы, откройте обращение: расскажите, что нужно, приложите документы — и мы подготовим бесплатный план лечения.",
    "Akkauntingiz tayyor. Tayyor bo'lganingizda murojaat oching: nima kerakligini ayting, hujjatlarni yuboring — biz bepul davolash rejasini tayyorlaymiz.",
  ),
  noCaseYet: l(
    "You have no case yet. Start one whenever you are ready — it takes about two minutes, and it appears here straight away.",
    "У вас пока нет обращения. Откройте его, когда будете готовы, — это около двух минут, и оно сразу появится здесь.",
    "Sizda hali murojaat yo'q. Tayyor bo'lganingizda oching — taxminan ikki daqiqa, va u darhol shu yerda paydo bo'ladi.",
  ),
  startCase: l("Start a case", "Открыть обращение", "Murojaat ochish"),
  newCaseTitle: l("Start a new case", "Новое обращение", "Yangi murojaat"),
  newCaseLead: l(
    "Your details are filled in from your account. Tell us what you need and we draft your free plan.",
    "Ваши данные подставлены из аккаунта. Расскажите, что нужно, — и мы подготовим бесплатный план.",
    "Ma'lumotlaringiz akkauntdan olindi. Nima kerakligini ayting — biz bepul reja tayyorlaymiz.",
  ),
  newCase: l("New case", "Новое обращение", "Yangi murojaat"),
  meanwhile: l("Meanwhile, you can", "А пока вы можете", "Hozircha siz"),
};
