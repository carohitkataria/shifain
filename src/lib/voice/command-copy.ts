/**
 * What the assistant says when it carries out a command. Written out, not
 * generated, so a command answer costs nothing and says exactly what
 * happened. Short sentences, because most of these are read aloud.
 */
export type SayLang = "en" | "ru" | "uz";

type Line = Record<SayLang, string>;

export const SAY = {
  help: {
    en: "You can just say what you need. For example: “make me a plan for a knee replacement”, “what's my case status”, “show my plan”, “add visa support”, “I'd prefer Chennai”, “how much is heart bypass”, “sign me in”, “talk to a coordinator”, or “use a male voice”.",
    ru: "Просто скажите, что нужно. Например: «составь план на замену колена», «какой статус моей заявки», «покажи мой план», «добавь визовую поддержку», «лучше Ченнаи», «сколько стоит шунтирование», «войти», «соедини с координатором» или «мужской голос».",
    uz: "Nima kerakligini ayting. Masalan: «tizza almashtirish uchun reja tuz», «arizam qanday holatda», «rejamni ko'rsat», «viza yordamini qo'sh», «Chennai afzal», «shuntlash qancha turadi», «kirish», «koordinator bilan gaplashmoqchiman» yoki «erkak ovozi».",
  },
  cancelled: { en: "Okay, cancelled.", ru: "Хорошо, отменено.", uz: "Mayli, bekor qilindi." },
  nothingToRepeat: { en: "There's nothing to repeat yet.", ru: "Пока нечего повторить.", uz: "Hozircha takrorlaydigan narsa yo'q." },
  emergency: {
    en: "If this is happening now, please call your local emergency number straight away, or go to the nearest emergency department. We arrange planned treatment and can't help in an emergency. When you're safe, we're here.",
    ru: "Если это происходит сейчас, немедленно позвоните в местную скорую помощь или поезжайте в ближайшее приёмное отделение. Мы организуем плановое лечение и не можем помочь в экстренной ситуации. Когда будете в безопасности — мы рядом.",
    uz: "Agar bu hozir sodir bo'layotgan bo'lsa, darhol mahalliy tez yordam raqamiga qo'ng'iroq qiling yoki eng yaqin shoshilinch bo'limga boring. Biz rejali davolashni tashkil qilamiz va favqulodda vaziyatda yordam bera olmaymiz.",
  },

  // starting a case
  startAsk: {
    en: "Let's set that up. Which treatment are you looking for — or tell me what the doctor said, in your own words.",
    ru: "Давайте начнём. Какое лечение вам нужно? Или расскажите своими словами, что сказал врач.",
    uz: "Boshlaymiz. Qanday davolash kerak? Yoki shifokor nima deganini o'z so'zlaringiz bilan ayting.",
  },
  startWithTreatment: {
    en: "Got it — {treatment}. Tell me a little about the condition: the symptoms, how long it has been going on, and what your doctor has said. You can attach reports too.",
    ru: "Понял — {treatment}. Расскажите немного о состоянии: симптомы, как давно это длится и что сказал врач. Можно прикрепить анализы.",
    uz: "Tushundim — {treatment}. Holat haqida biroz aytib bering: belgilar, qancha vaqtdan beri va shifokor nima dedi. Tahlillarni ham biriktirishingiz mumkin.",
  },
  startHaveEnough: {
    en: "Of course — I have what I need about your condition. Just a few quick details for your free plan.",
    ru: "Конечно — о вашем состоянии информации достаточно. Осталось несколько данных для бесплатного плана.",
    uz: "Albatta — holatingiz haqida ma'lumot yetarli. Bepul reja uchun bir nechta ma'lumot qoldi.",
  },
  startNeedTreatment: {
    en: "Of course. Has a doctor suggested a particular treatment or operation? If not, that's fine — just say so and our doctors will advise.",
    ru: "Конечно. Врач уже предлагал конкретное лечение или операцию? Если нет — ничего страшного, просто скажите, и наши врачи подскажут.",
    uz: "Albatta. Shifokor biror davolash yoki operatsiyani taklif qilganmi? Bo'lmasa, mayli — shunday deng, shifokorlarimiz maslahat beradi.",
  },
  alreadyHaveCase: {
    en: "You already have a case with us, {reference}. Do you want to start a new, separate one?",
    ru: "У вас уже есть заявка {reference}. Открыть новую, отдельную?",
    uz: "Sizda allaqachon {reference} arizasi bor. Yangi, alohida ariza ochaylikmi?",
  },
  caseCreatedSignedIn: {
    en: "You're signed in on this device, so you can ask “what's my case status” any time.",
    ru: "Вы вошли на этом устройстве — в любой момент спросите «какой статус моей заявки».",
    uz: "Siz bu qurilmada tizimga kirdingiz — istalgan vaqtda «arizam qanday holatda» deb so'rang.",
  },

  // who you are
  needSignIn: {
    en: "If you already have a case with us, I need to know it's you: tell me the email you gave us, or say “reference” to use your case reference and phone. If you're new, say “make me a plan” — it's free.",
    ru: "Если у вас уже есть заявка, нужно убедиться, что это вы: назовите email, который вы указывали, или скажите «номер заявки». Если вы впервые — скажите «составь план», это бесплатно.",
    uz: "Agar sizda ariza bo'lsa, bu siz ekaningizni bilishim kerak: bergan emailingizni ayting yoki «ariza raqami» deng. Yangi bo'lsangiz — «reja tuz» deng, bu bepul.",
  },
  askEmail: { en: "What's your email address?", ru: "Какой у вас email?", uz: "Email manzilingiz qanday?" },
  askEmailAgain: {
    en: "I didn't catch an email address. Try spelling it, like “anna dot k at gmail dot com”.",
    ru: "Не расслышал адрес. Продиктуйте по буквам, например «anna точка k собака gmail точка com».",
    uz: "Email manzilini tushunmadim. Harflab ayting, masalan «anna nuqta k at gmail nuqta com».",
  },
  codeSent: {
    en: "If {email} is on a case with us, a six-digit code is on its way. Read it to me when it arrives. If nothing comes in a minute, say “use my reference”.",
    ru: "Если {email} есть в одной из заявок, на него отправлен шестизначный код. Продиктуйте его, когда придёт. Если письма нет — скажите «по номеру заявки».",
    uz: "Agar {email} arizalardan birida bo'lsa, unga olti xonali kod yuborildi. Kelganda menga ayting. Kelmasa — «ariza raqami bilan» deng.",
  },
  askCodeAgain: { en: "Please say the six digits of the code.", ru: "Продиктуйте шесть цифр кода.", uz: "Kodning olti raqamini ayting." },
  codeWrong: {
    en: "That code didn't work. Check the latest email and try again, or say “cancel”.",
    ru: "Код не подошёл. Проверьте последнее письмо и попробуйте ещё раз, или скажите «отмена».",
    uz: "Kod mos kelmadi. Oxirgi xatni tekshirib qayta urinib ko'ring yoki «bekor» deng.",
  },
  askReference: {
    en: "Read me your case reference — it starts with S H, then four groups of letters and numbers.",
    ru: "Продиктуйте номер заявки — он начинается с S H, затем четыре группы букв и цифр.",
    uz: "Ariza raqamini ayting — u S H bilan boshlanadi, keyin to'rtta harf va raqamlar guruhi.",
  },
  referenceAgain: {
    en: "I didn't get the whole reference. It's S H and then sixteen letters and numbers — you can type it instead.",
    ru: "Не получилось разобрать номер целиком. Это S H и шестнадцать букв и цифр — можно напечатать.",
    uz: "Raqamni to'liq tushunmadim. Bu S H va o'n olti harf va raqam — yozib yuborishingiz mumkin.",
  },
  askPhone: { en: "And the phone number you gave us?", ru: "И номер телефона, который вы указывали?", uz: "Va bergan telefon raqamingiz?" },
  signInFailed: {
    en: "That reference and phone number don't match. Please check them, or say “talk to a coordinator”.",
    ru: "Номер заявки и телефон не совпадают. Проверьте их или скажите «соедини с координатором».",
    uz: "Ariza raqami va telefon mos kelmadi. Tekshirib ko'ring yoki «koordinator bilan gaplashmoqchiman» deng.",
  },
  signedIn: { en: "You're signed in.", ru: "Вы вошли.", uz: "Tizimga kirdingiz." },
  signedOut: { en: "You're signed out on this device.", ru: "Вы вышли на этом устройстве.", uz: "Bu qurilmada tizimdan chiqdingiz." },
  noCases: {
    en: "I can't find a case for you yet. Say “make me a plan” to start one — it's free.",
    ru: "Пока не нахожу вашей заявки. Скажите «составь план», чтобы начать — это бесплатно.",
    uz: "Hozircha arizangiz topilmadi. Boshlash uchun «reja tuz» deng — bu bepul.",
  },

  // status
  status: {
    en: "Your case {reference}: {status}.",
    ru: "Ваша заявка {reference}: {status}.",
    uz: "Arizangiz {reference}: {status}.",
  },
  statusPlan: {
    en: "The plan suggests {treatment}{city}, about {days} days in India.",
    ru: "План предлагает: {treatment}{city}, около {days} дней в Индии.",
    uz: "Reja taklifi: {treatment}{city}, Hindistonda taxminan {days} kun.",
  },
  statusNext: {
    en: "Say “show my plan” to open it, or “change my plan” to adjust it.",
    ru: "Скажите «покажи план», чтобы открыть его, или «измени план».",
    uz: "Ochish uchun «rejamni ko'rsat», o'zgartirish uchun «rejani o'zgartir» deng.",
  },
  casesList: { en: "You have {count} cases: {list}.", ru: "У вас {count} заявки: {list}.", uz: "Sizda {count} ta ariza bor: {list}." },
  opening: { en: "Opening {what}.", ru: "Открываю {what}.", uz: "{what} ochilmoqda." },
  planNotReady: {
    en: "Your plan isn't ready yet — it usually takes about a minute. I'll open the page; it fills itself in.",
    ru: "План ещё готовится — обычно около минуты. Открываю страницу, она обновится сама.",
    uz: "Reja hali tayyor emas — odatda bir daqiqacha. Sahifani ochaman, u o'zi yangilanadi.",
  },

  // editing the plan
  editMenu: {
    en: "You can change the city, add or remove services — flights, airport pickup, visa support, hotel, interpreter, SIM card, meals or follow-up — set when you'd like to travel and who's coming with you, or add medical details for a fresh plan. What would you like to change?",
    ru: "Можно изменить город, добавить или убрать услуги — перелёт, трансфер, визовую поддержку, гостиницу, переводчика, SIM-карту, питание или наблюдение после лечения — указать даты поездки и сопровождающих или добавить медицинские детали для нового плана. Что изменить?",
    uz: "Shaharni o'zgartirish, xizmatlarni qo'shish yoki olib tashlash — parvoz, aeroport transferi, viza, mehmonxona, tarjimon, SIM-karta, ovqat yoki keyingi kuzatuv — safar vaqti va hamrohlarni belgilash yoki yangi reja uchun tibbiy ma'lumot qo'shish mumkin. Nimani o'zgartiramiz?",
  },
  serviceAdded: { en: "Done — {service} is added to your plan.", ru: "Готово — {service} добавлено в план.", uz: "Tayyor — {service} rejaga qo'shildi." },
  serviceRemoved: { en: "Done — {service} is removed from your plan.", ru: "Готово — {service} убрано из плана.", uz: "Tayyor — {service} rejadan olib tashlandi." },
  whichService: {
    en: "Which service? Flights, airport pickup, visa support, hotel, interpreter, SIM card, meals or follow-up.",
    ru: "Какую услугу? Перелёт, трансфер, визовая поддержка, гостиница, переводчик, SIM-карта, питание или наблюдение.",
    uz: "Qaysi xizmat? Parvoz, transfer, viza, mehmonxona, tarjimon, SIM-karta, ovqat yoki kuzatuv.",
  },
  citySet: {
    en: "Noted — you'd prefer {city}. Your coordinator will look for the right hospital there.",
    ru: "Записал — вы предпочитаете {city}. Координатор подберёт подходящую больницу там.",
    uz: "Yozib oldim — {city} afzal. Koordinator u yerda mos shifoxona qidiradi.",
  },
  whichCity: { en: "Which city would you prefer? We work in {cities}.", ru: "Какой город предпочитаете? Мы работаем в: {cities}.", uz: "Qaysi shahar afzal? Biz {cities} shaharlarida ishlaymiz." },
  travelSet: { en: "Noted — you'd like to travel {month}.", ru: "Записал — поездка: {month}.", uz: "Yozib oldim — safar: {month}." },
  whichMonth: { en: "When would you like to travel?", ru: "Когда вы хотели бы поехать?", uz: "Qachon safar qilmoqchisiz?" },
  companionsSet: {
    en: "Noted — {count} travelling with you.",
    ru: "Записал — сопровождающих: {count}.",
    uz: "Yozib oldim — hamrohlar: {count}.",
  },
  companionsNone: { en: "Noted — you're travelling on your own.", ru: "Записал — вы едете один.", uz: "Yozib oldim — yolg'iz kelasiz." },
  askDetails: {
    en: "Go ahead — tell me what's new: symptoms, test results, or what your doctor said.",
    ru: "Слушаю — расскажите, что нового: симптомы, результаты анализов или слова врача.",
    uz: "Eshitaman — nima yangilik: belgilar, tahlil natijalari yoki shifokor gaplari.",
  },
  detailsSaved: {
    en: "Thanks, I've added that to your case. Shall I update your plan with it? It takes about a minute.",
    ru: "Спасибо, добавил в вашу заявку. Обновить план с учётом этого? Это около минуты.",
    uz: "Rahmat, arizangizga qo'shdim. Shu asosida rejani yangilaylikmi? Bir daqiqacha vaqt oladi.",
  },
  detailsSavedNoReplan: {
    en: "Thanks, I've added that to your case. Your coordinator will see it.",
    ru: "Спасибо, добавил в заявку. Координатор это увидит.",
    uz: "Rahmat, arizaga qo'shdim. Koordinator buni ko'radi.",
  },
  replanning: {
    en: "Updating your plan now. It takes about a minute — I'll open the page and it fills itself in.",
    ru: "Обновляю план. Это около минуты — открываю страницу, она обновится сама.",
    uz: "Rejani yangilayapman. Bir daqiqacha — sahifani ochaman, u o'zi yangilanadi.",
  },
  replanLimit: {
    en: "Your plan has been updated a few times today already. Your coordinator will review the latest details instead.",
    ru: "Сегодня план уже обновлялся несколько раз. Координатор посмотрит новые детали сам.",
    uz: "Bugun reja bir necha marta yangilandi. Koordinator yangi ma'lumotlarni o'zi ko'rib chiqadi.",
  },
  planBusy: {
    en: "Your plan is already being prepared. Give it a minute.",
    ru: "План уже готовится. Подождите минуту.",
    uz: "Reja allaqachon tayyorlanmoqda. Bir daqiqa kuting.",
  },
  emailConfirm: { en: "I'll add {email} to your case. Is that right?", ru: "Добавлю {email} в вашу заявку. Верно?", uz: "{email} manzilini arizangizga qo'shaman. To'g'rimi?" },
  emailSaved: {
    en: "Saved. You can now sign in with {email} — we'll send a code.",
    ru: "Сохранил. Теперь можно входить по {email} — пришлём код.",
    uz: "Saqlandi. Endi {email} orqali kira olasiz — kod yuboramiz.",
  },
  sayYesNo: { en: "Please say yes or no.", ru: "Скажите «да» или «нет».", uz: "«Ha» yoki «yo'q» deng." },

  // prices
  costRange: {
    en: "An indicative range for {treatment} in India is {min} to {max} US dollars for the treatment itself. Your exact quote comes from the hospital after they review your reports.",
    ru: "Ориентировочная стоимость «{treatment}» в Индии — от {min} до {max} долларов США за само лечение. Точную цену назовёт больница после изучения ваших документов.",
    uz: "Hindistonda «{treatment}» uchun taxminiy narx — davolashning o'zi {min} dan {max} AQSh dollarigacha. Aniq narxni shifoxona hujjatlaringizni ko'rib chiqib aytadi.",
  },
  costUnknown: {
    en: "I don't have a price for that yet. Say “make me a plan” and a coordinator will send you a proper estimate — it's free.",
    ru: "Пока нет цены на это. Скажите «составь план», и координатор пришлёт точную оценку — бесплатно.",
    uz: "Bunga hozircha narx yo'q. «Reja tuz» deng — koordinator aniq hisobni yuboradi, bepul.",
  },
  costWhich: { en: "Which treatment would you like a price for?", ru: "Для какого лечения назвать цену?", uz: "Qaysi davolash narxini aytay?" },

  // people
  human: {
    en: "I've asked a coordinator to get back to you here. You can also reach us directly below.",
    ru: "Я попросил координатора ответить вам здесь. Можно связаться и напрямую — ниже.",
    uz: "Koordinatordan sizga shu yerda javob berishini so'radim. Quyida to'g'ridan-to'g'ri bog'lanish ham mumkin.",
  },
  humanNoContact: {
    en: "I've asked a coordinator to get back to you here, usually within a few hours.",
    ru: "Я попросил координатора ответить вам здесь, обычно в течение нескольких часов.",
    uz: "Koordinatordan sizga shu yerda javob berishini so'radim, odatda bir necha soat ichida.",
  },
  whatsapp: { en: "Tap below to message us on WhatsApp.", ru: "Нажмите ниже, чтобы написать нам в WhatsApp.", uz: "WhatsApp'da yozish uchun pastdagi tugmani bosing." },
  call: { en: "Tap below to call a coordinator.", ru: "Нажмите ниже, чтобы позвонить координатору.", uz: "Koordinatorga qo'ng'iroq qilish uchun pastdagi tugmani bosing." },
  upload: {
    en: "Tap “Attach report” below, or the paperclip, and choose the file — a photo or PDF is fine.",
    ru: "Нажмите «Прикрепить» ниже или скрепку и выберите файл — подойдёт фото или PDF.",
    uz: "Pastdagi «Biriktirish» tugmasini yoki qisqichni bosib faylni tanlang — rasm yoki PDF bo'ladi.",
  },

  // settings
  language: { en: "Sure, I'll speak English.", ru: "Хорошо, перехожу на русский.", uz: "Mayli, o'zbek tilida gaplashamiz." },
  whichLanguage: { en: "English, Russian or Uzbek?", ru: "Английский, русский или узбекский?", uz: "Ingliz, rus yoki o'zbek tili?" },
  voiceChanged: { en: "Okay — how does this sound?", ru: "Хорошо — так лучше?", uz: "Mayli — shunday yaxshimi?" },
  voiceMenu: {
    en: "Tap the voice button above the microphone to choose a voice, or say “female voice”, “male voice”, “slower” or “faster”.",
    ru: "Нажмите кнопку голоса над микрофоном, чтобы выбрать голос, или скажите «женский голос», «мужской голос», «медленнее» или «быстрее».",
    uz: "Ovozni tanlash uchun mikrofon ustidagi tugmani bosing yoki «ayol ovozi», «erkak ovozi», «sekinroq» yoki «tezroq» deng.",
  },
} satisfies Record<string, Line>;

export type SayKey = keyof typeof SAY;

export function say(key: SayKey, lang: SayLang, vars: Record<string, string | number> = {}): string {
  const template = SAY[key][lang] || SAY[key].en;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}

export const STATUS_WORDS: Record<string, Line> = {
  new: { en: "received, waiting for review", ru: "получена, ждёт рассмотрения", uz: "qabul qilindi, ko'rib chiqilmoqda" },
  planning: { en: "your plan is being prepared", ru: "план готовится", uz: "reja tayyorlanmoqda" },
  planned: { en: "your draft plan is ready, and a coordinator will review it with you", ru: "черновик плана готов, координатор проверит его вместе с вами", uz: "reja loyihasi tayyor, koordinator uni siz bilan ko'rib chiqadi" },
  "plan-failed": { en: "a coordinator is preparing your plan by hand", ru: "координатор готовит план вручную", uz: "koordinator rejani qo'lda tayyorlamoqda" },
  confirmed: { en: "confirmed with the hospital", ru: "подтверждена больницей", uz: "shifoxona tomonidan tasdiqlangan" },
  closed: { en: "closed", ru: "закрыта", uz: "yopilgan" },
};

export const SERVICE_WORDS: Record<string, Line> = {
  flights: { en: "flights", ru: "перелёт", uz: "parvoz" },
  "airport-transfers": { en: "airport pickup", ru: "трансфер из аэропорта", uz: "aeroport transferi" },
  "visa-support": { en: "visa support", ru: "визовая поддержка", uz: "viza yordami" },
  accommodation: { en: "a hotel", ru: "гостиница", uz: "mehmonxona" },
  interpreter: { en: "an interpreter", ru: "переводчик", uz: "tarjimon" },
  "local-sim": { en: "a local SIM card", ru: "местная SIM-карта", uz: "mahalliy SIM-karta" },
  meals: { en: "meals", ru: "питание", uz: "ovqat" },
  "post-treatment-followup": { en: "follow-up after treatment", ru: "наблюдение после лечения", uz: "davolashdan keyingi kuzatuv" },
};

export const PAGE_WORDS: Record<string, Line> = {
  plan: { en: "your plan", ru: "ваш план", uz: "rejangiz" },
  hospitals: { en: "our hospitals", ru: "наши больницы", uz: "shifoxonalarimiz" },
  doctors: { en: "our doctors", ru: "наших врачей", uz: "shifokorlarimiz" },
  treatments: { en: "treatments", ru: "виды лечения", uz: "davolash turlari" },
  conditions: { en: "conditions", ru: "заболевания", uz: "kasalliklar" },
  home: { en: "the home page", ru: "главную страницу", uz: "bosh sahifa" },
  portal: { en: "your account", ru: "ваш кабинет", uz: "shaxsiy kabinetingiz" },
};

export function sayLang(lang: string | null | undefined): SayLang {
  const base = (lang ?? "").toLowerCase().split("-")[0];
  return base === "ru" || base === "uz" ? base : "en";
}
