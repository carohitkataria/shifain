/**
 * The privacy notice and terms of use, written from what the site actually
 * does (see lib/reports, lib/case-flow, lib/mailer, lib/ai). English, Russian
 * and Uzbek are written here; the other languages are translated on the page.
 *
 * Before launch these should be read by counsel for India's Digital Personal
 * Data Protection Act and the patients' home countries, and the company's
 * registered name and address added (LEGAL_UPDATED marks the version).
 */
import type { L } from "./content-types";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });

export type LegalSection = { title: L; paragraphs: L[] };
export type LegalDoc = { title: L; lead: L; sections: LegalSection[] };

/** The version date, shown in the reader's language. */
export const LEGAL_UPDATED = "2026-11-24";

export const LEGAL_COMMON = {
  updated: l("Last updated", "Последнее обновление", "Oxirgi yangilanish"),
  questions: l(
    "Questions about this page, or a request about your data: write to",
    "Вопросы по этой странице или запрос о ваших данных — пишите на",
    "Ushbu sahifa bo'yicha savollar yoki ma'lumotlaringiz haqida so'rov uchun yozing:",
  ),
  orChat: l("or in the chat on this site.", "или в чат на сайте.", "yoki saytdagi chatga."),
  privacyLink: l("Privacy policy", "Политика конфиденциальности", "Maxfiylik siyosati"),
  termsLink: l("Terms of use", "Условия использования", "Foydalanish shartlari"),
};

export const PRIVACY: LegalDoc = {
  title: l("Privacy policy", "Политика конфиденциальности", "Maxfiylik siyosati"),
  lead: l(
    "Shifain helps patients from abroad plan medical treatment in India. To do that we need some personal and health information. This page says what we collect, why, who sees it, how long we keep it, and what you can ask us to do with it.",
    "Shifain помогает пациентам из-за рубежа спланировать лечение в Индии. Для этого нам нужны некоторые личные и медицинские данные. Здесь сказано, что мы собираем, зачем, кто это видит, сколько мы это храним и что вы можете попросить нас сделать.",
    "Shifain chet ellik bemorlarga Hindistonda davolanishni rejalashtirishda yordam beradi. Buning uchun bizga ba'zi shaxsiy va tibbiy ma'lumotlar kerak. Bu sahifada nimani, nima uchun yig'ishimiz, kim ko'rishi, qancha saqlashimiz va siz nimani so'rashingiz mumkinligi yozilgan.",
  ),
  sections: [
    {
      title: l("What we collect", "Что мы собираем", "Nimalarni yig'amiz"),
      paragraphs: [
        l(
          "Contact details you give us: your name, phone or WhatsApp number, country and, if you give it, your email address.",
          "Контактные данные, которые вы указываете: имя, телефон или WhatsApp, страну и, если вы её даёте, электронную почту.",
          "Siz bergan aloqa ma'lumotlari: ismingiz, telefon yoki WhatsApp raqamingiz, mamlakatingiz va, agar bersangiz, elektron pochtangiz.",
        ),
        l(
          "Health information you choose to share: medical reports and scans you upload, what you write or say about your condition, and answers to our questions.",
          "Медицинские сведения, которыми вы решаете поделиться: загруженные выписки и снимки, то, что вы пишете или говорите о своём состоянии, и ответы на наши вопросы.",
          "Siz ulashishni tanlagan tibbiy ma'lumotlar: yuklagan hujjat va tasvirlaringiz, ahvolingiz haqida yozgan yoki aytganlaringiz va savollarimizga javoblaringiz.",
        ),
        l(
          "Details of your trip once you go ahead: travel dates, people travelling with you and the documents needed for a medical visa.",
          "Детали поездки, если вы решите ехать: даты, сопровождающие и документы для медицинской визы.",
          "Safarga qaror qilsangiz, uning tafsilotlari: sanalar, siz bilan boradiganlar va tibbiy viza uchun hujjatlar.",
        ),
      ],
    },
    {
      title: l("Why we use it", "Зачем мы это используем", "Nima uchun foydalanamiz"),
      paragraphs: [
        l(
          "To prepare your free treatment plan and cost estimate, to have a coordinator contact you, to share your case with the hospital you choose, and to arrange your visa, travel and stay. We do not sell your information and do not use it for advertising.",
          "Чтобы подготовить бесплатный план лечения и смету, чтобы с вами связался координатор, чтобы передать ваш случай выбранной клинике и организовать визу, поездку и проживание. Мы не продаём ваши данные и не используем их для рекламы.",
          "Bepul davolash rejasi va narx hisobini tayyorlash, koordinator siz bilan bog'lanishi, ishingizni siz tanlagan shifoxonaga yuborish hamda viza, safar va turar joyni tashkil qilish uchun. Ma'lumotlaringizni sotmaymiz va reklama uchun ishlatmaymiz.",
        ),
      ],
    },
    {
      title: l("Who sees it", "Кто это видит", "Kim ko'radi"),
      paragraphs: [
        l(
          "Our coordinators. The hospital and doctors treating you, once you decide to go ahead. Family members only if you invite them, and only the parts you choose.",
          "Наши координаторы. Клиника и врачи, которые будут вас лечить, — когда вы решите ехать. Члены семьи — только если вы их пригласите и только то, что вы выберете.",
          "Koordinatorlarimiz. Sizni davolaydigan shifoxona va shifokorlar — siz qaror qilganingizdan keyin. Oila a'zolari — faqat siz taklif qilsangiz va faqat siz tanlagan qismlarni.",
        ),
        l(
          "Service providers that process it for us: an AI service (Google Gemini, or Anthropic Claude as a backup) reads reports to draft your plan; ElevenLabs turns speech into text and back in voice chat; Resend sends our emails; Telegram and WhatsApp carry messages you choose to receive there; MongoDB Atlas stores our database. They may process data outside your country and outside India.",
          "Сервисы, которые обрабатывают данные по нашему поручению: сервис ИИ (Google Gemini или, как запасной, Anthropic Claude) читает документы, чтобы составить черновик плана; ElevenLabs преобразует речь в текст и обратно в голосовом чате; Resend отправляет наши письма; Telegram и WhatsApp доставляют сообщения, если вы выбрали эти каналы; MongoDB Atlas хранит нашу базу данных. Они могут обрабатывать данные за пределами вашей страны и Индии.",
          "Biz uchun ma'lumotlarni qayta ishlaydigan xizmatlar: sun'iy intellekt xizmati (Google Gemini yoki zaxira sifatida Anthropic Claude) rejangiz loyihasini tuzish uchun hujjatlarni o'qiydi; ElevenLabs ovozli chatda nutqni matnga va aksincha aylantiradi; Resend xatlarimizni yuboradi; Telegram va WhatsApp siz tanlagan xabarlarni yetkazadi; MongoDB Atlas ma'lumotlar bazamizni saqlaydi. Ular ma'lumotlarni mamlakatingiz va Hindistondan tashqarida qayta ishlashi mumkin.",
        ),
      ],
    },
    {
      title: l("How long we keep it", "Сколько мы храним", "Qancha saqlaymiz"),
      paragraphs: [
        l(
          "Your case record, including your contact details, the plan and the reports and scans you upload, is kept on file. It is not deleted automatically. To have it removed, write to us and our team will delete it.",
          "Запись о вашем случае — контакты, план и загруженные выписки и снимки — хранится у нас. Она не удаляется автоматически. Чтобы её удалить, напишите нам, и наша команда её удалит.",
          "Ishingiz yozuvi — aloqa ma'lumotlari, reja va siz yuklagan hujjat va tasvirlar — bizda saqlanadi. U avtomatik o'chirilmaydi. Uni o'chirish uchun bizga yozing, jamoamiz uni o'chiradi.",
        ),
      ],
    },
    {
      title: l("Your choices and rights", "Ваш выбор и права", "Tanlovingiz va huquqlaringiz"),
      paragraphs: [
        l(
          "You can ask to see the information we hold about you, to correct it, to have it deleted, or to withdraw your consent at any time. In your account you can choose what each family member sees. Withdrawing consent does not affect what was done before, but we may then be unable to keep helping with your treatment.",
          "Вы можете в любой момент попросить показать, исправить или удалить ваши данные либо отозвать согласие. В личном кабинете вы можете выбрать, что видит каждый член семьи. Отзыв согласия не меняет уже сделанного, но после этого мы, возможно, не сможем продолжать помогать с лечением.",
          "Istalgan vaqtda biz saqlayotgan ma'lumotlarni ko'rsatish, tuzatish, o'chirish yoki rozilikni qaytarib olishni so'rashingiz mumkin. Shaxsiy kabinetda har bir oila a'zosi nimani ko'rishini tanlaysiz. Rozilikni qaytarib olish avval qilinganlarga ta'sir qilmaydi, lekin keyin davolanishingizda yordam berishni davom ettira olmasligimiz mumkin.",
        ),
      ],
    },
    {
      title: l("Cookies", "Файлы cookie", "Cookie fayllari"),
      paragraphs: [
        l(
          "We use only the cookies the site needs: to keep you signed in, to remember your language, to keep a chat conversation going, and to note which partner referred you. We do not use advertising or tracking cookies.",
          "Мы используем только необходимые сайту cookie: чтобы вы оставались в аккаунте, чтобы помнить ваш язык, чтобы продолжался разговор в чате и чтобы отметить, какой партнёр вас направил. Рекламных и отслеживающих cookie нет.",
          "Biz faqat sayt uchun zarur cookie'lardan foydalanamiz: tizimda qolishingiz, tilingizni eslab qolish, chat suhbatini davom ettirish va sizni qaysi hamkor yo'llaganini belgilash uchun. Reklama yoki kuzatuv cookie'lari yo'q.",
        ),
        l(
          "To know how many people the site helps, we count visits without cookies: which page was opened (a plan counts only as “a plan”, never by its number), the language, the kind of device, the country (from your time zone) and the site you came from. Your address is never stored; a visitor is recognised only within one day, through a code that cannot be traced back to you. If your browser asks not to be tracked, we do not count your visit. Cloudflare Web Analytics, which also sets no cookies, counts visits to our public pages; your own plan and account pages are never sent to it.",
          "Чтобы понимать, скольким людям помогает сайт, мы считаем посещения без cookie: какая страница открыта (план — только как «план», никогда по номеру), язык, тип устройства, страна (по часовому поясу) и сайт, с которого вы пришли. Ваш адрес не сохраняется; посетитель узнаётся только в течение одного дня, по коду, который невозможно связать с вами. Если ваш браузер просит не отслеживать, мы не считаем ваше посещение. Cloudflare Web Analytics, тоже без cookie, считает посещения публичных страниц; страницы вашего плана и кабинета ему не передаются.",
          "Sayt nechta odamga yordam berayotganini bilish uchun tashriflarni cookie'siz sanaymiz: qaysi sahifa ochilgani (reja faqat «reja» sifatida, hech qachon raqami bilan emas), til, qurilma turi, mamlakat (vaqt mintaqangiz bo'yicha) va qaysi saytdan kelganingiz. Manzilingiz saqlanmaydi; tashrifchi faqat bir kun ichida, sizga bog'lab bo'lmaydigan kod orqali taniladi. Brauzeringiz kuzatmaslikni so'rasa, tashrifingiz sanalmaydi. Cloudflare Web Analytics ham cookie'siz ochiq sahifalarimizga tashriflarni sanaydi; rejangiz va kabinetingiz sahifalari unga yuborilmaydi.",
        ),
      ],
    },
    {
      title: l("Security", "Безопасность", "Xavfsizlik"),
      paragraphs: [
        l(
          "Your account is protected by one-time codes or a password stored only as a secure hash. Opening a report needs a recent sign-in. A case number alone never opens your case. Emails we send never contain medical details.",
          "Аккаунт защищён одноразовыми кодами или паролем, который хранится только в виде защищённого хеша. Чтобы открыть документ, нужен недавний вход. Номер случая сам по себе никогда не открывает ваш случай. В наших письмах нет медицинских подробностей.",
          "Akkauntingiz bir martalik kodlar yoki faqat xavfsiz xesh ko'rinishida saqlanadigan parol bilan himoyalangan. Hujjatni ochish uchun yaqinda kirgan bo'lishingiz kerak. Ish raqamining o'zi hech qachon ishingizni ochmaydi. Biz yuboradigan xatlarda tibbiy tafsilotlar bo'lmaydi.",
        ),
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: l("Terms of use", "Условия использования", "Foydalanish shartlari"),
  lead: l(
    "These terms apply when you use the Shifain website, chat and patient account. Please read them with the privacy policy.",
    "Эти условия действуют, когда вы пользуетесь сайтом Shifain, чатом и личным кабинетом. Читайте их вместе с политикой конфиденциальности.",
    "Ushbu shartlar Shifain sayti, chati va shaxsiy kabinetidan foydalanganingizda amal qiladi. Ularni maxfiylik siyosati bilan birga o'qing.",
  ),
  sections: [
    {
      title: l("What Shifain does", "Чем занимается Shifain", "Shifain nima qiladi"),
      paragraphs: [
        l(
          "Shifain is a medical travel facilitator. We help you choose a hospital in India, prepare an estimate and arrange the visa, travel, stay and interpreter. We are not a hospital and do not diagnose or treat anyone. Diagnosis, treatment decisions and medical care are the responsibility of the treating hospital and doctors.",
          "Shifain — посредник в медицинском туризме. Мы помогаем выбрать клинику в Индии, готовим смету и организуем визу, поездку, проживание и переводчика. Мы не клиника, не ставим диагнозов и не лечим. За диагноз, решения о лечении и медицинскую помощь отвечают клиника и лечащие врачи.",
          "Shifain — tibbiy sayohat vositachisi. Hindistonda shifoxona tanlash, narx hisobini tayyorlash, viza, safar, turar joy va tarjimonni tashkil qilishda yordam beramiz. Biz shifoxona emasmiz, tashxis qo'ymaymiz va davolamaymiz. Tashxis, davolash qarorlari va tibbiy yordam uchun davolovchi shifoxona va shifokorlar javobgar.",
        ),
      ],
    },
    {
      title: l("Plans and estimates", "Планы и сметы", "Rejalar va narx hisoblari"),
      paragraphs: [
        l(
          "The first plan is drafted automatically from what you send, with the help of AI, and can be wrong. It is a starting point, not medical advice. Prices are estimates until the treating hospital has reviewed your reports and confirmed them in writing.",
          "Первый план составляется автоматически по присланным материалам с помощью ИИ и может содержать ошибки. Это отправная точка, а не медицинская консультация. Цены — оценка, пока клиника не изучит ваши документы и не подтвердит их письменно.",
          "Birinchi reja siz yuborgan ma'lumotlar asosida sun'iy intellekt yordamida avtomatik tuziladi va xato bo'lishi mumkin. Bu tibbiy maslahat emas, boshlang'ich nuqta. Narxlar davolovchi shifoxona hujjatlaringizni ko'rib chiqib, yozma tasdiqlamaguncha taxminiydir.",
        ),
      ],
    },
    {
      title: l("Emergencies", "Неотложные случаи", "Shoshilinch holatlar"),
      paragraphs: [
        l(
          "Shifain arranges planned treatment and cannot help in an emergency. If you or someone with you is in danger now, call your local emergency number or go to the nearest emergency department.",
          "Shifain организует плановое лечение и не может помочь в экстренной ситуации. Если вам или тому, кто рядом, сейчас угрожает опасность, звоните в местную скорую помощь или поезжайте в ближайшее приёмное отделение.",
          "Shifain rejali davolashni tashkil qiladi va shoshilinch holatda yordam bera olmaydi. Agar siz yoki yoningizdagi kishi hozir xavf ostida bo'lsa, mahalliy tez yordamga qo'ng'iroq qiling yoki eng yaqin shoshilinch bo'limga boring.",
        ),
      ],
    },
    {
      title: l("Your part", "Ваша часть", "Sizning qismingiz"),
      paragraphs: [
        l(
          "Please give true and complete information, and only share someone else's details or reports with their permission. Keep your sign-in codes and password to yourself. Do not use the site to send anything unlawful or to disrupt the service.",
          "Пожалуйста, сообщайте правдивые и полные сведения и передавайте данные или документы другого человека только с его разрешения. Никому не сообщайте коды входа и пароль. Не используйте сайт для отправки незаконных материалов или нарушения работы сервиса.",
          "Iltimos, to'g'ri va to'liq ma'lumot bering, boshqa kishining ma'lumotlari yoki hujjatlarini faqat uning ruxsati bilan ulashing. Kirish kodlari va parolingizni hech kimga bermang. Saytdan noqonuniy narsalar yuborish yoki xizmatni buzish uchun foydalanmang.",
        ),
      ],
    },
    {
      title: l("Payments and changes", "Оплата и изменения", "To'lov va o'zgarishlar"),
      paragraphs: [
        l(
          "Treatment is paid to the hospital under its own terms. Any fee for Shifain's own services is agreed with you in writing before you pay. We may update these terms; the date at the top shows the current version.",
          "Лечение оплачивается клинике на её условиях. Любая плата за услуги самого Shifain согласуется с вами письменно до оплаты. Мы можем обновлять эти условия; дата вверху показывает текущую версию.",
          "Davolanish shifoxonaning o'z shartlari asosida unga to'lanadi. Shifain xizmatlari uchun har qanday to'lov siz bilan to'lovdan oldin yozma kelishiladi. Bu shartlarni yangilashimiz mumkin; yuqoridagi sana joriy versiyani ko'rsatadi.",
        ),
      ],
    },
  ],
};
