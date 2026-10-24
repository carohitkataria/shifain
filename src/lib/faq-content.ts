import type { L } from "./content-types";

/**
 * The questions the site starts with. They are copied into the database the
 * first time FAQs are read, and from then on the console owns them: editing
 * or deleting one there sticks, and a code update never puts them back.
 *
 * Rules change, so the answers say what is usual and leave the final word to
 * the official visa site and the coordinator. No answer names the patient's
 * own country — the site speaks to every passport.
 */
export type FaqCategory = "visa" | "travel" | "costs" | "treatment" | "general";

export const FAQ_CATEGORIES: { key: FaqCategory; label: L }[] = [
  { key: "visa", label: { en: "Visa & documents", ru: "Виза и документы", uz: "Viza va hujjatlar" } },
  { key: "travel", label: { en: "Travel & stay", ru: "Поездка и проживание", uz: "Safar va turar joy" } },
  { key: "costs", label: { en: "Costs & payment", ru: "Стоимость и оплата", uz: "Narx va toʻlov" } },
  { key: "treatment", label: { en: "Treatment", ru: "Лечение", uz: "Davolash" } },
  { key: "general", label: { en: "About Shifain", ru: "О Shifain", uz: "Shifain haqida" } },
];

export type StarterFaq = { id: string; category: FaqCategory; question: L; answer: L; keywords: string[] };

export const STARTER_FAQS: StarterFaq[] = [
  {
    id: "visa-need",
    category: "visa",
    question: {
      en: "Do I need a visa to come to India for treatment?",
      ru: "Нужна ли виза, чтобы приехать в Индию на лечение?",
      uz: "Hindistonga davolanish uchun kelish uchun viza kerakmi?",
    },
    answer: {
      en: "Most international patients need a medical visa. There are two kinds: the e-Medical visa, applied for online, and the regular Medical visa, applied for at an Indian embassy or visa centre. Planned treatment is not allowed on a tourist or business visa. Your Shifain coordinator checks which visa fits your passport and your treatment before you apply.",
      ru: "Большинству иностранных пациентов нужна медицинская виза. Есть два вида: электронная медицинская виза (e-Medical), которую оформляют онлайн, и обычная медицинская виза, которую получают в посольстве Индии или визовом центре. Плановое лечение по туристической или деловой визе не допускается. Координатор Shifain проверит, какая виза подходит для вашего паспорта и лечения, до подачи заявления.",
      uz: "Koʻpchilik xorijiy bemorlarga tibbiy viza kerak. Ikki turi bor: onlayn rasmiylashtiriladigan elektron tibbiy viza (e-Medical) va Hindiston elchixonasi yoki viza markazida olinadigan oddiy tibbiy viza. Rejali davolanish turistik yoki biznes viza bilan ruxsat etilmaydi. Shifain koordinatori ariza berishdan oldin pasportingiz va davolanishingizga qaysi viza mos kelishini tekshiradi.",
    },
    keywords: ["visa", "medical visa", "need visa", "виза", "медицинская виза", "viza", "tibbiy viza"],
  },
  {
    id: "visa-emedical",
    category: "visa",
    question: {
      en: "What is the e-Medical visa?",
      ru: "Что такое электронная медицинская виза (e-Medical)?",
      uz: "Elektron tibbiy viza (e-Medical) nima?",
    },
    answer: {
      en: "It is an electronic visa for treatment, applied for on the Government of India's official e-Visa website — no embassy visit. Once approved, you receive an electronic travel authorisation by email; print it and carry it with your passport. It usually allows up to three entries and a stay of up to 60 days from your first arrival, which covers most treatments. Always apply on the official government site only; other sites charge extra.",
      ru: "Это электронная виза для лечения, которую оформляют на официальном сайте электронных виз Правительства Индии — без визита в посольство. После одобрения вы получите электронное разрешение на въезд по почте; распечатайте его и возьмите вместе с паспортом. Обычно она даёт до трёх въездов и пребывание до 60 дней с первого прибытия — этого хватает для большинства видов лечения. Подавайте заявление только на официальном государственном сайте: другие сайты берут дополнительную плату.",
      uz: "Bu davolanish uchun elektron viza boʻlib, Hindiston hukumatining rasmiy e-Visa saytida rasmiylashtiriladi — elchixonaga borish shart emas. Tasdiqlangach, elektron kirish ruxsatnomasi pochtangizga keladi; uni chop etib, pasport bilan birga olib yuring. Odatda u uch martagacha kirish va birinchi kelgan kundan boshlab 60 kungacha qolish imkonini beradi — bu koʻpchilik davolanishlar uchun yetarli. Arizani faqat rasmiy davlat saytida bering: boshqa saytlar qoʻshimcha haq oladi.",
    },
    keywords: ["e-medical", "e medical", "evisa", "e-visa", "online visa", "электронная виза", "e-виза", "elektron viza"],
  },
  {
    id: "visa-time",
    category: "visa",
    question: {
      en: "How long does the medical visa take?",
      ru: "Сколько времени оформляется медицинская виза?",
      uz: "Tibbiy viza qancha vaqtda rasmiylashtiriladi?",
    },
    answer: {
      en: "An e-Medical visa is usually decided within 3 to 5 working days; apply at least 4 days before you fly, and ideally 7 to 10 days ahead. A regular Medical visa from an embassy or visa centre can take one to two weeks or more, depending on where you apply. If your treatment is urgent, tell your coordinator — the hospital can mark its letter as urgent.",
      ru: "Решение по электронной медицинской визе обычно принимают за 3–5 рабочих дней; подавайте заявление не позднее чем за 4 дня до вылета, а лучше за 7–10 дней. Обычная медицинская виза через посольство или визовый центр может занять одну-две недели и больше — в зависимости от места подачи. Если лечение срочное, скажите координатору: больница может отметить письмо как срочное.",
      uz: "Elektron tibbiy viza boʻyicha qaror odatda 3–5 ish kunida chiqadi; arizani uchishdan kamida 4 kun oldin, yaxshisi 7–10 kun oldin bering. Elchixona yoki viza markazi orqali oddiy tibbiy viza qayerda topshirilishiga qarab bir-ikki hafta yoki undan koʻproq vaqt olishi mumkin. Davolanish shoshilinch boʻlsa, koordinatorga ayting — shifoxona xatini shoshilinch deb belgilashi mumkin.",
    },
    keywords: ["how long visa", "visa time", "visa days", "сколько виза", "срок визы", "viza qancha", "viza muddati"],
  },
  {
    id: "visa-documents",
    category: "visa",
    question: {
      en: "What documents do I need for the medical visa?",
      ru: "Какие документы нужны для медицинской визы?",
      uz: "Tibbiy viza uchun qanday hujjatlar kerak?",
    },
    answer: {
      en: "Usually: a passport valid for at least six months from your arrival, with at least two blank pages; a recent passport-style photo on a white background; a scan of your passport's photo page; the invitation letter from the treating hospital; and your recent medical reports. A regular Medical visa may also ask for a completed application form and proof that you can pay for treatment. Your coordinator sends you the exact list for your passport.",
      ru: "Обычно нужны: паспорт, действительный не менее шести месяцев с даты прибытия, с двумя чистыми страницами; свежее фото как на паспорт на белом фоне; скан страницы паспорта с фото; приглашение от больницы, где вы будете лечиться; и ваши последние медицинские заключения. Для обычной медицинской визы могут также попросить заполненную анкету и подтверждение, что вы можете оплатить лечение. Координатор пришлёт точный список для вашего паспорта.",
      uz: "Odatda: kelgan kundan boshlab kamida olti oy amal qiladigan va kamida ikkita boʻsh sahifasi bor pasport; oq fonda yangi pasport uslubidagi surat; pasportning surat sahifasi skaneri; davolanadigan shifoxonadan taklifnoma; va soʻnggi tibbiy xulosalaringiz. Oddiy tibbiy viza uchun toʻldirilgan anketa va davolanishga toʻlay olishingizni tasdiqlovchi hujjat ham soʻralishi mumkin. Koordinator pasportingiz uchun aniq roʻyxatni yuboradi.",
    },
    keywords: ["visa documents", "documents for visa", "passport", "photo", "документы для визы", "паспорт", "viza hujjatlari", "pasport"],
  },
  {
    id: "visa-invitation",
    category: "visa",
    question: {
      en: "What is the hospital invitation letter, and how do I get it?",
      ru: "Что такое приглашение от больницы и как его получить?",
      uz: "Shifoxona taklifnomasi nima va uni qanday olish mumkin?",
    },
    answer: {
      en: "It is a letter on the treating hospital's letterhead confirming your diagnosis, the treatment planned and its expected length. The visa officer needs it to approve a medical visa. Once you choose a hospital in your Shifain plan and send scans of your passport (and your attendants' passports), we ask the hospital for it — it usually arrives in one to two working days, and it appears in your account under Documents.",
      ru: "Это письмо на бланке больницы, где вы будете лечиться, с диагнозом, планируемым лечением и его примерной длительностью. Без него визовый офицер не одобрит медицинскую визу. Когда вы выберете больницу в плане Shifain и пришлёте сканы паспорта (и паспортов сопровождающих), мы запросим письмо у больницы — обычно оно готово за один-два рабочих дня и появляется в вашем аккаунте в разделе «Документы».",
      uz: "Bu davolanadigan shifoxona blankasidagi xat boʻlib, unda tashxisingiz, rejalashtirilgan davolash va uning taxminiy muddati koʻrsatiladi. Viza xodimi tibbiy vizani tasdiqlash uchun unga muhtoj. Shifain rejangizda shifoxonani tanlab, pasportingiz (va hamrohlaringiz pasportlari) skanerini yuborganingizdan soʻng, biz shifoxonadan xatni soʻraymiz — odatda u bir-ikki ish kunida tayyor boʻladi va akkauntingizdagi «Hujjatlar» boʻlimida paydo boʻladi.",
    },
    keywords: ["invitation letter", "visa letter", "visa invitation", "приглашение", "письмо для визы", "taklifnoma", "taklif xati"],
  },
  {
    id: "visa-attendants",
    category: "visa",
    question: {
      en: "Can family members travel with me?",
      ru: "Могут ли со мной поехать родственники?",
      uz: "Men bilan oila aʼzolarim borishi mumkinmi?",
    },
    answer: {
      en: "Yes. Up to two attendants, usually close family members, can come on a Medical Attendant visa linked to your medical visa. Each attendant needs their own passport, photo and visa, and their names must be on the hospital's invitation letter — so share their passport scans with your coordinator at the same time as yours. Children travelling with you need their own visa too.",
      ru: "Да. До двух сопровождающих, обычно близкие родственники, могут приехать по визе сопровождающего (Medical Attendant), привязанной к вашей медицинской визе. Каждому сопровождающему нужны свой паспорт, фото и виза, а их имена должны быть в приглашении от больницы — поэтому отправьте координатору сканы их паспортов вместе с вашим. Детям, которые едут с вами, тоже нужна своя виза.",
      uz: "Ha. Ikki nafargacha hamroh, odatda yaqin qarindoshlar, sizning tibbiy vizangizga bogʻlangan hamroh vizasi (Medical Attendant) bilan kelishi mumkin. Har bir hamrohga oʻz pasporti, surati va vizasi kerak, ularning ismlari esa shifoxona taklifnomasida boʻlishi shart — shuning uchun ularning pasport skanerlarini oʻzingizniki bilan birga koordinatorga yuboring. Siz bilan boradigan bolalarga ham alohida viza kerak.",
    },
    keywords: ["attendant", "family visa", "companion", "relative", "сопровождающий", "родственники", "hamroh", "oila"],
  },
  {
    id: "visa-attendant-later",
    category: "visa",
    question: {
      en: "I already have my medical visa. Can my attendant apply now?",
      ru: "У меня уже есть медицинская виза. Может ли сопровождающий подать заявление сейчас?",
      uz: "Menda tibbiy viza allaqachon bor. Hamrohim hozir ariza bera oladimi?",
    },
    answer: {
      en: "An attendant's visa is tied to the patient's, so it is far easier when everyone applies together. Once the patient's visa is granted, hospitals often cannot issue a fresh invitation letter for an attendant alone. If this has happened, tell your coordinator straight away — we will check with the hospital what can still be done.",
      ru: "Виза сопровождающего привязана к визе пациента, поэтому проще всего, когда все подают заявления одновременно. Когда виза пациента уже выдана, больницы часто не могут выписать новое приглашение только для сопровождающего. Если так получилось, сразу скажите координатору — мы уточним в больнице, что ещё можно сделать.",
      uz: "Hamroh vizasi bemor vizasiga bogʻlangan, shuning uchun hamma birga ariza bergani ancha oson. Bemor vizasi berilgandan keyin shifoxonalar koʻpincha faqat hamroh uchun yangi taklifnoma bera olmaydi. Agar shunday boʻlgan boʻlsa, darhol koordinatorga ayting — shifoxonadan nima qilish mumkinligini aniqlaymiz.",
    },
    keywords: ["attendant later", "attendant after", "сопровождающий потом", "hamroh keyin"],
  },
  {
    id: "visa-extend",
    category: "visa",
    question: {
      en: "Can my medical visa be extended if treatment takes longer?",
      ru: "Можно ли продлить медицинскую визу, если лечение затянется?",
      uz: "Davolanish choʻzilsa, tibbiy vizani uzaytirish mumkinmi?",
    },
    answer: {
      en: "Yes, usually. While you are in India, an extension is requested online from the Foreigners Regional Registration Office (FRRO), with a letter from your treating hospital saying why more time is needed. Apply well before your visa ends. Your coordinator gets the hospital letter and helps you fill in the request.",
      ru: "Да, как правило. Находясь в Индии, продление запрашивают онлайн в региональном отделе регистрации иностранцев (FRRO) с письмом от больницы о том, почему нужно больше времени. Подавайте заявку заранее, до окончания визы. Координатор получит письмо от больницы и поможет заполнить заявку.",
      uz: "Ha, odatda. Hindistonda boʻlganingizda uzaytirish xorijliklarni roʻyxatga olish mintaqaviy idorasidan (FRRO) onlayn soʻraladi, shifoxonadan nega koʻproq vaqt kerakligi haqida xat bilan. Arizani viza tugashidan ancha oldin bering. Koordinator shifoxona xatini oladi va arizani toʻldirishda yordam beradi.",
    },
    keywords: ["extend visa", "visa extension", "frro", "продлить визу", "продление", "vizani uzaytirish"],
  },
  {
    id: "visa-register",
    category: "visa",
    question: {
      en: "Do I need to register after I arrive?",
      ru: "Нужно ли регистрироваться после приезда?",
      uz: "Kelganimdan keyin roʻyxatdan oʻtishim kerakmi?",
    },
    answer: {
      en: "It depends on your visa. A regular Medical visa usually needs registration with the FRRO within 14 days of arrival; this is done online through e-FRRO. e-Medical visa holders generally do not need to register unless they stay beyond 180 days. Your coordinator tells you whether it applies to you and helps with the form.",
      ru: "Это зависит от визы. С обычной медицинской визой, как правило, нужно зарегистрироваться в FRRO в течение 14 дней после прибытия; это делается онлайн через e-FRRO. Владельцам электронной медицинской визы обычно не нужно регистрироваться, если они не остаются дольше 180 дней. Координатор скажет, касается ли это вас, и поможет с анкетой.",
      uz: "Bu vizangizga bogʻliq. Oddiy tibbiy viza bilan odatda kelgandan keyin 14 kun ichida FRRO da roʻyxatdan oʻtish kerak; bu e-FRRO orqali onlayn qilinadi. Elektron tibbiy viza egalari odatda 180 kundan ortiq qolmasa, roʻyxatdan oʻtishlari shart emas. Koordinator bu sizga tegishlimi yoki yoʻqligini aytadi va anketada yordam beradi.",
    },
    keywords: ["register", "registration", "frro", "регистрация", "зарегистрироваться", "roʻyxatdan oʻtish", "registratsiya"],
  },
  {
    id: "visa-shifain-help",
    category: "visa",
    question: {
      en: "How does Shifain help with my visa?",
      ru: "Как Shifain помогает с визой?",
      uz: "Shifain viza bilan qanday yordam beradi?",
    },
    answer: {
      en: "We get the hospital's invitation letter for you and your attendants, send you the document list for your passport, check your application before you submit it, and stay with you until the visa arrives. The visa itself is issued only by the Government of India: you apply and pay the government fee on the official website or at the visa centre. Shifain never asks you to pay a visa fee to us.",
      ru: "Мы получаем приглашение от больницы для вас и сопровождающих, присылаем список документов для вашего паспорта, проверяем заявление перед подачей и остаёмся на связи, пока виза не будет готова. Саму визу выдаёт только Правительство Индии: вы подаёте заявление и оплачиваете государственный сбор на официальном сайте или в визовом центре. Shifain никогда не просит оплатить визовый сбор нам.",
      uz: "Biz siz va hamrohlaringiz uchun shifoxona taklifnomasini olamiz, pasportingiz uchun hujjatlar roʻyxatini yuboramiz, arizani topshirishdan oldin tekshiramiz va viza tayyor boʻlguncha siz bilan aloqada boʻlamiz. Vizaning oʻzini faqat Hindiston hukumati beradi: arizani rasmiy saytda yoki viza markazida topshirasiz va davlat yigʻimini toʻlaysiz. Shifain hech qachon viza yigʻimini bizga toʻlashni soʻramaydi.",
    },
    keywords: ["visa help", "visa support", "help with visa", "помощь с визой", "визовая поддержка", "viza yordam"],
  },
  {
    id: "visa-rejected",
    category: "visa",
    question: {
      en: "What if my visa is refused?",
      ru: "Что делать, если в визе отказали?",
      uz: "Vizadan rad etilsa nima qilish kerak?",
    },
    answer: {
      en: "Send the refusal message to your coordinator. Most refusals come from something fixable — a photo that does not meet the rules, a passport scan that cannot be read, or details that do not match the invitation letter. We find the reason, the hospital reissues its letter if needed, and you apply again. The government fee for the refused application is not returned.",
      ru: "Отправьте сообщение об отказе координатору. Чаще всего отказ вызван тем, что можно исправить: фото не по требованиям, нечитаемый скан паспорта или данные, не совпадающие с приглашением. Мы найдём причину, при необходимости больница переоформит письмо, и вы подадите заявление снова. Государственный сбор за отклонённое заявление не возвращается.",
      uz: "Rad etish haqidagi xabarni koordinatorga yuboring. Koʻpincha rad etish tuzatsa boʻladigan narsadan kelib chiqadi: talablarga mos kelmaydigan surat, oʻqib boʻlmaydigan pasport skaneri yoki taklifnomaga mos kelmaydigan maʼlumotlar. Biz sababini topamiz, kerak boʻlsa shifoxona xatni qayta beradi va siz yana ariza topshirasiz. Rad etilgan ariza uchun davlat yigʻimi qaytarilmaydi.",
    },
    keywords: ["visa refused", "visa rejected", "refusal", "отказ в визе", "отказали", "viza rad", "rad etildi"],
  },
  {
    id: "visa-airport",
    category: "visa",
    question: {
      en: "What should I carry for immigration at the airport?",
      ru: "Что взять с собой для паспортного контроля в аэропорту?",
      uz: "Aeroportdagi pasport nazorati uchun nimalarni olish kerak?",
    },
    answer: {
      en: "Your passport, a printed copy of your e-visa approval (or the visa in your passport), the hospital's invitation letter, your medical reports, and the address of your hotel or the hospital. Keep them in your hand luggage. Your Shifain pickup details and your coordinator's number are in your account, and the driver meets you after immigration.",
      ru: "Паспорт, распечатку одобрения электронной визы (или визу в паспорте), приглашение от больницы, медицинские заключения и адрес отеля или больницы. Держите их в ручной клади. Данные о встрече Shifain и номер координатора есть в вашем аккаунте, а водитель встретит вас после паспортного контроля.",
      uz: "Pasportingiz, elektron viza tasdigʻining chop etilgan nusxasi (yoki pasportdagi viza), shifoxona taklifnomasi, tibbiy xulosalaringiz va mehmonxona yoki shifoxona manzili. Ularni qoʻl yukingizda saqlang. Shifain kutib olish maʼlumotlari va koordinator raqami akkauntingizda bor, haydovchi esa sizni pasport nazoratidan keyin kutib oladi.",
    },
    keywords: ["airport", "immigration", "carry", "аэропорт", "паспортный контроль", "aeroport", "pasport nazorati"],
  },
];
