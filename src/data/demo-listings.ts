import { toListingImage, type PhotoId } from "@/data/photos";
import type { Listing } from "@/lib/listings/types";

/**
 * Sample listings for the landing page.
 *
 * These are NOT offers anyone has made. They exist so the search, map and detail pages can
 * be shown working before the site is connected to the Rezido API, and every one carries
 * `isDemo: true`, which the UI turns into a visible "Namuna" (sample) label. None is marked
 * verified: verification is a claim about a real owner.
 *
 * Districts use the backend's wire spelling. Prices are in UZS at levels plausible for
 * Tashkent; coordinates sit inside the named district. The photographs are real but do not
 * depict these (fictional) homes — their alt text describes the photograph itself.
 */

type DemoListingInput = Omit<Listing, "images" | "isDemo" | "isVerified" | "ownerName"> & {
  photos: PhotoId[];
};

const DEMO_LISTING_INPUTS: DemoListingInput[] = [
  {
    id: "namuna-yunusobod-3-xonali",
    title: "3 xonali kvartira, Yunusobod 19-mavze",
    listingType: "sale",
    propertyType: "apartment",
    price: { amount: 1_050_000_000, currency: "UZS" },
    rooms: 3,
    areaTotal: 78,
    floor: 6,
    floorsTotal: 9,
    location: {
      district: "Yunusobod",
      address: "Yunusobod tumani, 19-mavze",
      region: "Toshkent",
      point: { latitude: 41.3685, longitude: 69.2875 },
    },
    photos: ["livingRoomEmpty", "kitchenOpenPlan", "bathroomCompact"],
    description:
      "Yorug‘ va keng kvartira, derazalar ikki tomonga qaragan. Oshxona mehmonxona bilan birlashtirilgan, hammom alohida. Yaqin atrofda maktab, bog‘cha va oziq-ovqat do‘konlari bor.",
    renovation: "euro",
    furnishing: "partially_furnished",
    publishedAt: "2026-10-14",
  },
  {
    id: "namuna-chilonzor-2-xonali-ijara",
    title: "2 xonali kvartira, Chilonzor 12-kvartal",
    listingType: "rent",
    propertyType: "apartment",
    price: { amount: 5_500_000, currency: "UZS" },
    rooms: 2,
    areaTotal: 54,
    floor: 4,
    floorsTotal: 9,
    location: {
      district: "Chilonzor",
      address: "Chilonzor tumani, 12-kvartal",
      region: "Toshkent",
      point: { latitude: 41.2765, longitude: 69.1995 },
    },
    photos: ["bedroomCozy", "kitchenSimple"],
    description:
      "Uzoq muddatga ijaraga beriladi. Kvartira jihozlangan: yotoqxonada ikki kishilik karavot, oshxonada muzlatkich va plita bor. Metro bekatiga piyoda 7–8 daqiqa.",
    renovation: "cosmetic",
    furnishing: "furnished",
    publishedAt: "2026-10-15",
  },
  {
    id: "namuna-anhor-4-xonali",
    title: "4 xonali kvartira, Anhor bo‘yi",
    listingType: "sale",
    propertyType: "apartment",
    price: { amount: 2_400_000_000, currency: "UZS" },
    rooms: 4,
    areaTotal: 112,
    floor: 2,
    floorsTotal: 4,
    location: {
      district: "Shayxontohur",
      address: "Shayxontohur tumani, Anhor bo‘yi ko‘chasi",
      region: "Toshkent",
      point: { latitude: 41.3195, longitude: 69.2565 },
    },
    photos: ["tashkentAnhorBuilding", "bedroomModern", "kitchenOpenPlan"],
    description:
      "Tarixiy binodagi baland shiftli kvartira. Xonalar alohida, ikkita balkon bor. Anhor kanali va shahar markazi bir necha daqiqalik masofada.",
    renovation: "designer",
    furnishing: "furnished",
    publishedAt: "2026-10-09",
  },
  {
    id: "namuna-mirobod-hovli",
    title: "5 xonali hovli uy, Mirobod tumani",
    listingType: "sale",
    propertyType: "house",
    price: { amount: 3_200_000_000, currency: "UZS" },
    rooms: 5,
    areaTotal: 180,
    floor: null,
    floorsTotal: 1,
    location: {
      district: "Mirobod",
      address: "Mirobod tumani",
      region: "Toshkent",
      point: { latitude: 41.296, longitude: 69.296 },
    },
    photos: ["tashkentMahallaHouses", "kitchenFitted"],
    description:
      "Tinch mahalladagi bir qavatli hovli uy. Yer maydoni 4 sotix, hovlida meva daraxtlari va avtomobil uchun joy bor. Gaz, suv va kanalizatsiya ulangan.",
    renovation: "cosmetic",
    furnishing: "unfurnished",
    publishedAt: "2026-10-06",
  },
  {
    id: "namuna-mirzo-ulugbek-1-xonali-ijara",
    title: "1 xonali kvartira, Mirzo Ulug‘bek",
    listingType: "rent",
    propertyType: "apartment",
    price: { amount: 4_200_000, currency: "UZS" },
    rooms: 1,
    areaTotal: 38,
    floor: 7,
    floorsTotal: 12,
    location: {
      district: "Mirzo Ulugbek",
      address: "Mirzo Ulug‘bek tumani, Buyuk Ipak yo‘li ko‘chasi",
      region: "Toshkent",
      point: { latitude: 41.3385, longitude: 69.3345 },
    },
    photos: ["bedroomModern", "bathroomCompact"],
    description:
      "Yangi uydagi ixcham kvartira. To‘liq jihozlangan, konditsioner va kir yuvish mashinasi bor. Bir kishi yoki juftlik uchun qulay.",
    renovation: "euro",
    furnishing: "furnished",
    publishedAt: "2026-10-16",
  },
  {
    id: "namuna-sergeli-2-xonali",
    title: "2 xonali kvartira, Sergeli yangi uylar",
    listingType: "sale",
    propertyType: "apartment",
    price: { amount: 690_000_000, currency: "UZS" },
    rooms: 2,
    areaTotal: 58,
    floor: 9,
    floorsTotal: 16,
    location: {
      district: "Sergeli",
      address: "Sergeli tumani",
      region: "Toshkent",
      point: { latitude: 41.2275, longitude: 69.2195 },
    },
    photos: ["kitchenOpenPlan", "livingRoomEmpty"],
    description:
      "2024-yilda qurilgan uyda. Lift, yer osti avtoturargohi va bolalar maydonchasi bor. Kvartira ta’mirlangan, ko‘chib kirishga tayyor.",
    renovation: "euro",
    furnishing: "unfurnished",
    publishedAt: "2026-10-12",
  },
  {
    id: "namuna-yakkasaroy-3-xonali-ijara",
    title: "3 xonali kvartira, Yakkasaroy",
    listingType: "rent",
    propertyType: "apartment",
    price: { amount: 9_800_000, currency: "UZS" },
    rooms: 3,
    areaTotal: 86,
    floor: 5,
    floorsTotal: 9,
    location: {
      district: "Yakkasaroy",
      address: "Yakkasaroy tumani, Shota Rustaveli ko‘chasi",
      region: "Toshkent",
      point: { latitude: 41.288, longitude: 69.247 },
    },
    photos: ["kitchenFitted", "bedroomCozy"],
    description:
      "Oilaviy ijara uchun keng kvartira. Ikki yotoqxona, mehmonxona va jihozlangan oshxona. Kamida bir yilga ijaraga beriladi.",
    renovation: "euro",
    furnishing: "furnished",
    publishedAt: "2026-10-11",
  },
  {
    id: "namuna-uchtepa-1-xonali",
    title: "1 xonali kvartira, Uchtepa",
    listingType: "sale",
    propertyType: "apartment",
    price: { amount: 480_000_000, currency: "UZS" },
    rooms: 1,
    areaTotal: 36,
    floor: 2,
    floorsTotal: 5,
    location: {
      district: "Uchtepa",
      address: "Uchtepa tumani",
      region: "Toshkent",
      point: { latitude: 41.2955, longitude: 69.1735 },
    },
    photos: ["kitchenSimple", "bathroomCompact"],
    description:
      "Birinchi uy uchun qulay variant. Kvartira toza, oddiy ta’mirli. Yaqinida bozor va jamoat transporti bekatlari bor.",
    renovation: "cosmetic",
    furnishing: "unfurnished",
    publishedAt: "2026-10-08",
  },
];

export const DEMO_LISTINGS: Listing[] = DEMO_LISTING_INPUTS.map(({ photos, ...listing }) => ({
  ...listing,
  images: photos.map(toListingImage),
  isVerified: false,
  ownerName: null,
  isDemo: true,
}));
