/**
 * Uzbek (Latin) — the source dictionary. Every other locale must satisfy its shape.
 *
 * Values are plain strings so any slice can be handed to a Client Component as props.
 * Placeholders use `{name}` and are filled by `interpolate` from `@/i18n`.
 *
 * Typography: o‘ and g‘ are written with ‘ (U+2018), the tutuq belgisi with ’ (U+2019).
 */
export const uz = {
  meta: {
    title: "Rezido — O‘zbekistonda uy topishning qulay yo‘li",
    description:
      "Rezido orqali sotiladigan va ijaraga beriladigan uylarni toping, narxlarni solishtiring va xaritada joylashuvini ko‘ring.",
    siteName: "Rezido",
  },

  common: {
    skipToContent: "Asosiy mazmunga o‘tish",
    home: "Bosh sahifa",
    backHome: "Bosh sahifaga qaytish",
    comingSoon: "Tez orada",
    demoBadge: "Namuna",
    retry: "Qayta urinish",
    loading: "Yuklanmoqda…",
    close: "Yopish",
    details: "Batafsil",
    som: "so‘m",
    perMonth: "/oyiga",
  },

  nav: {
    label: "Asosiy navigatsiya",
    home: "Bosh sahifa",
    buy: "Sotib olish",
    rent: "Ijaraga olish",
    map: "Xarita",
    howItWorks: "Qanday ishlaydi?",
    listProperty: "E’lon joylashtirish",
    openMenu: "Menyuni ochish",
    closeMenu: "Menyuni yopish",
    homeLink: "Rezido — bosh sahifa",
  },

  language: {
    label: "Til",
    current: "Joriy til: {language}",
    soon: "tez orada",
  },

  hero: {
    eyebrow: "Uy-joy platformasi · O‘zbekiston",
    titleLead: "O‘zingizga mos",
    titleAccent: "uyni toping.",
    lead: "Sotib olish yoki ijaraga olish — kerakli uyni qulay qidiring, xaritada joylashuvini ko‘ring va egasi bilan bog‘laning.",
    searchLabel: "Uy qidirish",
    dealLabel: "E’lon turi",
    buy: "Sotib olish",
    rent: "Ijaraga olish",
    location: "Joylashuv",
    locationPlaceholder: "Tuman yoki manzil",
    propertyType: "Mulk turi",
    budget: "Byudjet",
    anyBudget: "Istalgan narx",
    submit: "Qidirish",
    imageAlt: "Toshkent, Yakkasaroy: naqshinkor balkonli g‘ishtin turar-joy binosi",
    insetAlt: "Yorug‘ mehmonxona: yumshoq divan va balkonga chiqadigan katta deraza",
    imageCaption: "Toshkent, Yakkasaroy",
  },

  listings: {
    eyebrow: "01 — Takliflar",
    title: "Ommabop takliflar",
    lead: "E’lon turi, tuman, mulk turi, xonalar soni va narx bo‘yicha saralang — natijalar darhol yangilanadi.",
    filtersLabel: "E’lonlarni filtrlash",
    dealLabel: "E’lon turi",
    dealAll: "Barchasi",
    dealSale: "Sotuv",
    dealRent: "Ijara",
    location: "Joylashuv",
    locationPlaceholder: "Tuman yoki manzil",
    propertyType: "Mulk turi",
    allTypes: "Barcha turlar",
    rooms: "Xonalar",
    roomsOption: "{count} xonali",
    roomsOptionMax: "4 va undan ko‘p xonali",
    price: "Narx",
    anyPrice: "Istalgan narx",
    priceNeedsDeal: "Avval sotuv yoki ijarani tanlang",
    priceUpTo: "{amount} gacha",
    priceFrom: "{amount} dan yuqori",
    priceBetween: "{min} – {max}",
    sort: "Saralash",
    sortNewest: "Eng yangilari",
    sortPriceAsc: "Narx: arzondan qimmatga",
    sortPriceDesc: "Narx: qimmatdan arzonga",
    reset: "Filtrlarni tozalash",
    resultsCount: "{count} ta e’lon",
    demoNotice:
      "Namuna e’lonlar: ular Rezido imkoniyatlarini ko‘rsatish uchun tayyorlangan va haqiqiy takliflar emas.",
    emptyTitle: "E’lonlar topilmadi",
    emptyBody: "Qidiruvni kengaytiring yoki ba’zi filtrlarni olib tashlang.",
    errorTitle: "E’lonlarni yuklab bo‘lmadi",
    errorBody: "Internet aloqasini tekshirib, qayta urinib ko‘ring.",
  },

  property: {
    forSale: "Sotuvda",
    forRent: "Ijaraga",
    verified: "Tasdiqlangan",
    rooms: "{count} xona",
    area: "{value} m²",
    floorOf: "{floor}/{total} qavat",
    floor: "{floor}-qavat",
    floorsTotal: "{count} qavatli",
    locationUnknown: "Manzil ko‘rsatilmagan",
    imageMissing: "Surat mavjud emas",
    open: "{title} — e’lonni ochish",
  },

  propertyTypes: {
    apartment: "Kvartira",
    house: "Uy",
    townhouse: "Taunxaus",
    room: "Xona",
    land: "Yer uchastkasi",
    commercial: "Tijorat binosi",
    garage: "Garaj",
    dacha: "Dala hovli",
    other: "Boshqa",
  },

  renovation: {
    rough: "Qora suvoq",
    needs_repair: "Ta’mir talab",
    cosmetic: "Kosmetik ta’mir",
    euro: "Yevrota’mir",
    designer: "Dizaynerlik ta’miri",
    other: "Boshqa",
  },

  furnishing: {
    furnished: "Jihozlangan",
    partially_furnished: "Qisman jihozlangan",
    unfurnished: "Jihozlanmagan",
  },

  map: {
    eyebrow: "02 — Xarita",
    title: "Xaritadan qidiring. Joylashuvni oldindan biling.",
    lead: "Uylarni joylashuvi bo‘yicha ko‘rib chiqing: qaysi tumanda, qaysi ko‘chaga yaqin va atrofida nimalar borligini e’lonni ochmasdan oldin tushuning.",
    points: [
      {
        title: "Narxlar xaritaning o‘zida",
        body: "Har bir uy narxi bilan belgilanadi: sotuv to‘q sariq, ijara yashil rangda.",
      },
      {
        title: "Hudud bo‘yicha qidiruv",
        body: "Xaritani suring va yaqinlashtiring — ko‘rinib turgan hududdagi e’lonlar chiqadi.",
      },
      {
        title: "Bir bosishda qisqacha ma’lumot",
        body: "Belgini bosing: narx, maydon va xonalar soni darhol ko‘rinadi.",
      },
    ],
    cta: "Xaritani ochish",
    canvasLabel: "Namuna e’lonlar joylashgan sxematik xarita",
    schematicNote: "Sxematik ko‘rinish",
    demoNote: "Sxematik ko‘rinish · namuna e’lonlar",
    legendSale: "Sotuv",
    legendRent: "Ijara",
    inView: "Xaritada {count} ta e’lon",
    pinLabel: "{district}: {title}, {price}",
    closePreview: "Qisqacha ma’lumotni yopish",
    filterLabel: "Xaritadagi e’lonlar",
  },

  mapPage: {
    title: "Xarita",
    description:
      "Toshkentdagi uylarni xaritada ko‘ring: narxlar, joylashuv va asosiy ma’lumotlar bir qarashda.",
    heading: "Uylar xaritada",
    lead: "Belgini bosing — e’lonning qisqacha ma’lumoti ochiladi. Sotuv va ijarani alohida ko‘rish uchun yuqoridagi tugmalardan foydalaning.",
    note: "Bu sahifada sxematik xarita ko‘rsatilgan. To‘liq interaktiv xarita Rezido mobil ilovasida ishlaydi; veb-versiyasi tayyorlanmoqda.",
    listTitle: "Xaritadagi e’lonlar",
  },

  howItWorks: {
    eyebrow: "03 — Qanday ishlaydi",
    title: "Qanday ishlaydi?",
    lead: "Qidiruvdan uchrashuvgacha — ortiqcha qadamlarsiz.",
    steps: [
      {
        title: "Kerakli hududni tanlang.",
        body: "Tuman yoki manzilni kiriting, yoki xaritada o‘zingizga qulay hududni ko‘rib chiqing.",
      },
      {
        title: "Takliflarni solishtiring.",
        body: "Narx, maydon, xonalar soni va qavatni yonma-yon ko‘ring, yoqqan e’lonlarni saqlab qo‘ying.",
      },
      {
        title: "O‘zingizga mos uyni toping.",
        body: "Egasi yoki rieltorga murojaat yuboring va uyni ko‘rishga kelishib oling.",
      },
    ],
  },

  why: {
    eyebrow: "04 — Nega Rezido",
    title: "Uy qidirish oddiy bo‘lishi kerak.",
    lead: "Rezido kerakli ma’lumotni bir joyga jamlaydi, ortiqchasini esa olib tashlaydi.",
    benefits: [
      {
        title: "Qulay qidiruv",
        body: "Narx, mulk turi, xonalar soni va tuman bo‘yicha filtrlar mos kelmaydigan e’lonlarni bir zumda chetlab o‘tadi.",
      },
      {
        title: "Xaritada kashf eting",
        body: "Har bir uy qayerda joylashganini va qaysi hududda ekanini xaritada ko‘ring.",
      },
      {
        title: "Batafsil ma’lumot",
        body: "Suratlar, maydon, qavat, xonalar soni va ta’mir holati — bitta sahifada.",
      },
      {
        title: "To‘g‘ridan-to‘g‘ri aloqa",
        body: "Savolingizni egasi yoki rieltorning o‘ziga yuboring.",
      },
      {
        title: "Oddiy tajriba",
        body: "E’lonlarni ro‘yxatdan o‘tmasdan ko‘rish mumkin; hisob faqat saqlash va murojaat yuborish uchun kerak.",
      },
    ],
  },

  owners: {
    eyebrow: "05 — Egalar uchun",
    title: "Uyingizni ijaraga bering yoki soting.",
    lead: "E’lon joylashtiring — xaridor yoki ijarachi uyingizni qidiruvda va xaritada topadi, savollarini esa to‘g‘ridan-to‘g‘ri sizga yuboradi.",
    checklistTitle: "E’lon uchun nima kerak",
    checklist: [
      "Uyning sifatli suratlari",
      "Aniq manzil",
      "Narx, maydon, xonalar soni va qavat",
    ],
    cta: "E’lon joylashtirish",
    imageAlt: "Toshkent: bog‘lar ortida Tashkent City majmuasining ko‘p qavatli binolari",
  },

  app: {
    eyebrow: "06 — Mobil ilova",
    title: "Rezido cho‘ntagingizda.",
    lead: "Mobil ilovada xaritadan qidirish, yoqqan uylarni saqlash, ularni solishtirish va egasiga murojaat yuborish mumkin.",
    features: [
      {
        title: "Xaritada qidiruv",
        body: "Ko‘rinib turgan hududdagi uylar narxi bilan.",
      },
      {
        title: "Saqlanganlar",
        body: "Yoqqan e’lonlar bir joyda turadi.",
      },
      {
        title: "Solishtirish",
        body: "Bir nechta uyni yonma-yon taqqoslang.",
      },
      {
        title: "Egasiga murojaat",
        body: "Savolingizni ilovaning o‘zidan yuboring.",
      },
    ],
    statusTitle: "Tez orada",
    statusBody:
      "Rezido mobil ilovasi ishlab chiqilmoqda. App Store va Google Play’da chiqishi bilan yuklab olish havolalari shu yerda paydo bo‘ladi.",
    appStore: "App Store’dan yuklab olish",
    googlePlay: "Google Play’dan yuklab olish",
    previewLabel: "Rezido mobil ilovasining bosh ekrani",
    previewSubtitle: "O‘zbekiston bo‘ylab uylar va joylar",
    previewSearch: "Nomi yoki manzili bo‘yicha qidiring",
    previewRecent: "Yangi e’lonlar",
    previewSeeAll: "Barchasi",
    previewTabs: ["Bosh sahifa", "Qidiruv", "Xarita", "Saqlangan", "Profil"],
  },

  faq: {
    eyebrow: "07 — Savollar",
    title: "Ko‘p beriladigan savollar",
    lead: "Javob topa olmadingizmi? Aloqa ma’lumotlari e’lon qilinishi bilan «Aloqa» sahifasida bo‘ladi.",
    items: [
      {
        question: "Rezido orqali uy qanday topiladi?",
        answer:
          "Qidiruvda e’lon turini (sotuv yoki ijara), tuman yoki manzilni, mulk turi, xonalar soni va narxni tanlang. Natijalarni narx yoki yangiligi bo‘yicha saralash mumkin. Yoqqan e’lonni ochib, suratlar va asosiy ma’lumotlarni ko‘rasiz.",
      },
      {
        question: "Ijara va sotuv e’lonlarini qanday farqlash mumkin?",
        answer:
          "Har bir e’londa «Sotuvda» yoki «Ijaraga» belgisi bor. Ijara narxi oyiga ko‘rsatiladi («/oyiga»). Xaritada sotuv narxlari to‘q sariq, ijara narxlari esa yashil rangda yoziladi.",
      },
      {
        question: "E’lonni qanday joylashtirish mumkin?",
        answer:
          "E’lon joylashtirish funksiyasi hozir ishlab chiqilmoqda va hali ishga tushirilmagan. Tayyor bo‘lgach, telefon raqamingiz orqali kirib, mulk ma’lumotlari, suratlar va narxni kiritib e’lon joylashtira olasiz. Nima kerak bo‘lishini «E’lon joylashtirish» sahifasida o‘qishingiz mumkin.",
      },
      {
        question: "Xarita orqali qidirish qanday ishlaydi?",
        answer:
          "Rezido mobil ilovasida xaritani suring va yaqinlashtiring — ko‘rinib turgan hududdagi e’lonlar narxi bilan belgilanadi. Belgini bossangiz, e’lonning qisqacha ma’lumoti ochiladi. Ushbu saytdagi xarita hozircha sxematik ko‘rinishda.",
      },
      {
        question: "Rezido mobil ilovasi mavjudmi?",
        answer:
          "Ilova ishlab chiqilmoqda va hali App Store yoki Google Play’da chiqmagan. Chiqqanidan so‘ng yuklab olish havolalari shu sahifada paydo bo‘ladi.",
      },
      {
        question: "3D ko‘rinish va virtual tur bo‘ladimi?",
        answer:
          "Ha, bu rejada. Binolarni 3D ko‘rinishda, qavat va xonadonlar bo‘yicha ko‘rib chiqish hamda uy ichidagi virtual tur keyingi bosqichlarda qo‘shiladi. Hozircha bu imkoniyatlar foydalanuvchilarga taqdim etilmagan.",
      },
    ],
    dataQuestion: "Saytdagi e’lonlar haqiqiymi?",
    dataAnswerDemo:
      "Hozircha saytda namuna e’lonlar ko‘rsatilmoqda. Ular platformani tanishtirish uchun tayyorlangan va haqiqiy takliflar emas — har biri «Namuna» belgisi bilan ajratilgan.",
    dataAnswerLive:
      "Ha. E’lonlar Rezido platformasidan olinadi va ularni uy egalari hamda rieltorlar joylashtiradi.",
  },

  footer: {
    tagline: "O‘zbekistonda uy topishning qulay yo‘li.",
    searchTitle: "Qidiruv",
    ownersTitle: "Egalar uchun",
    companyTitle: "Rezido",
    contact: "Aloqa",
    privacy: "Maxfiylik siyosati",
    terms: "Foydalanish shartlari",
    credits: "Surat mualliflari",
    mobileApp: "Mobil ilova",
    socialTitle: "Ijtimoiy tarmoqlar",
    copyright: "© {year} Rezido",
    demoNote: "Saytdagi e’lonlar — namuna ma’lumotlar.",
  },

  propertyPage: {
    breadcrumb: "Sahifalar ketma-ketligi",
    listings: "Takliflar",
    back: "Barcha takliflar",
    demoBanner:
      "Bu namuna e’lon. U Rezido imkoniyatlarini ko‘rsatish uchun tayyorlangan va haqiqiy taklif emas.",
    gallery: "Suratlar",
    photoAlt: "{title} — {index}-surat",
    facts: "Asosiy ma’lumotlar",
    area: "Maydon",
    rooms: "Xonalar",
    floor: "Qavat",
    propertyType: "Mulk turi",
    renovation: "Ta’mir",
    furnishing: "Jihozlar",
    description: "Tavsif",
    noDescription: "Tavsif berilmagan.",
    location: "Joylashuv",
    contactTitle: "Egasi bilan bog‘lanish",
    contactBody:
      "Murojaatlar Rezido mobil ilovasi orqali yuboriladi: egasi xabaringizni oladi va sizga javob beradi.",
    contactDemo: "Bu namuna e’lon, shuning uchun unga murojaat yuborib bo‘lmaydi.",
    owner: "Egasi",
    aboutApp: "Ilova haqida",
    similar: "O‘xshash e’lonlar",
    notFoundTitle: "E’lon topilmadi",
    notFoundBody: "Bu e’lon o‘chirilgan yoki havola noto‘g‘ri bo‘lishi mumkin.",
  },

  listProperty: {
    title: "E’lon joylashtirish",
    description: "Uyingizni Rezido’da sotish yoki ijaraga berish uchun nima kerak bo‘lishi haqida.",
    heading: "E’lon joylashtirish tez orada ishga tushadi.",
    lead: "Uy egalari va rieltorlar uchun e’lon joylashtirish funksiyasi ishlab chiqilmoqda. Hozircha bu sahifa orqali e’lon qabul qilinmaydi. Ishga tushganda quyidagilar kerak bo‘ladi:",
    steps: [
      {
        title: "Hisobga kirish",
        body: "Telefon raqamingiz va SMS orqali keladigan bir martalik kod bilan.",
      },
      {
        title: "Mulk haqida ma’lumot",
        body: "Mulk turi, manzil, maydon, xonalar soni, qavat va ta’mir holati.",
      },
      {
        title: "Suratlar",
        body: "Xonalar, oshxona, hammom va binoning tashqi ko‘rinishi — yorug‘ va aniq suratlar.",
      },
      {
        title: "Narx va e’lon turi",
        body: "Sotuv yoki ijara, narx va valyuta.",
      },
    ],
    browse: "Takliflarni ko‘rish",
  },

  placeholderPages: {
    contact: {
      title: "Aloqa",
      description: "Rezido bilan bog‘lanish.",
      heading: "Aloqa",
      body: "Rezido jamoasi bilan bog‘lanish ma’lumotlari tez orada shu sahifada e’lon qilinadi.",
      emailLabel: "Elektron pochta",
      phoneLabel: "Telefon",
    },
    privacy: {
      title: "Maxfiylik siyosati",
      description: "Rezido maxfiylik siyosati.",
      heading: "Maxfiylik siyosati",
      body: "Hujjat tayyorlanmoqda. Rezido maxfiylik siyosati e’lon qilinganda shu sahifada joylashtiriladi.",
    },
    terms: {
      title: "Foydalanish shartlari",
      description: "Rezido foydalanish shartlari.",
      heading: "Foydalanish shartlari",
      body: "Hujjat tayyorlanmoqda. Rezido foydalanish shartlari e’lon qilinganda shu sahifada joylashtiriladi.",
    },
  },

  credits: {
    title: "Surat mualliflari",
    description: "Saytda ishlatilgan suratlar, ularning mualliflari va litsenziyalari.",
    heading: "Surat mualliflari",
    lead: "Saytdagi barcha suratlar Wikimedia Commons’dan olingan va erkin litsenziyalar asosida ishlatiladi. Suratlar sayt uchun kichraytirilgan va qayta siqilgan.",
    author: "Muallif",
    license: "Litsenziya",
    source: "Manba",
  },

  notFound: {
    title: "Sahifa topilmadi",
    body: "Siz qidirgan sahifa mavjud emas yoki ko‘chirilgan.",
  },

  error: {
    title: "Nimadir xato ketdi",
    body: "Sahifani yuklashda xatolik yuz berdi. Qayta urinib ko‘ring.",
  },
};

export type Dictionary = typeof uz;
