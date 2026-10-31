import type { StaticImageData } from "next/image";

import bathroomCompact from "@/assets/photos/bathroom-compact.jpg";
import bedroomCozy from "@/assets/photos/bedroom-cozy.jpg";
import bedroomModern from "@/assets/photos/bedroom-modern.jpg";
import kitchenFitted from "@/assets/photos/kitchen-fitted.jpg";
import kitchenOpenPlan from "@/assets/photos/kitchen-open-plan.jpg";
import kitchenSimple from "@/assets/photos/kitchen-simple.jpg";
import livingRoomEmpty from "@/assets/photos/living-room-empty.jpg";
import livingRoomModern from "@/assets/photos/living-room-modern.jpg";
import tashkentAnhorBuilding from "@/assets/photos/tashkent-anhor-building.jpg";
import tashkentCitySkyline from "@/assets/photos/tashkent-city-skyline.jpg";
import tashkentMahallaHouses from "@/assets/photos/tashkent-mahalla-houses.jpg";
import tashkentResidentialBrick from "@/assets/photos/tashkent-residential-brick.jpg";
import type { ListingImage } from "@/lib/listings/types";

/**
 * Every photograph on the site, with its provenance.
 *
 * Nothing here is generated. Each file is a real photograph published on Wikimedia Commons
 * under CC0, CC BY or CC BY-SA. The interiors are the set rezido-backend seeds its demo
 * data with (`apps/properties/demo/images.py`); the Tashkent exteriors were added for the
 * landing. Attribution is rendered on /credits, which the licences require.
 *
 * Files were resized to at most 1600px wide and re-encoded with metadata stripped.
 */

export type Photo = {
  image: StaticImageData;
  /** Uzbek description of what the photograph actually shows. */
  alt: string;
  credit: {
    title: string;
    author: string;
    license: string;
    licenseUrl: string | null;
    source: string;
  };
};

export const PHOTOS = {
  tashkentResidentialBrick: {
    image: tashkentResidentialBrick,
    alt: "Toshkent, Yakkasaroy: naqshinkor balkonli g‘ishtin turar-joy binosi",
    credit: {
      title: "Turar joy binosi",
      author: "Quitochka",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      source: "https://commons.wikimedia.org/wiki/File:Turar_joy_binosi.jpg",
    },
  },
  tashkentAnhorBuilding: {
    image: tashkentAnhorBuilding,
    alt: "Toshkent, Anhor bo‘yi ko‘chasi: 1948-yilda qurilgan minorali turar-joy binosi",
    credit: {
      title: "Tashkent, Anhor bo‘yi ko‘chasi 6",
      author: "Carl Ha",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Tashkent,_Anhor_bo%E2%80%98yi_ko%E2%80%98chasi_6.jpg",
    },
  },
  tashkentMahallaHouses: {
    image: tashkentMahallaHouses,
    alt: "Toshkentdagi mahalla ko‘chasi: daraxtlar orasidagi bir qavatli uylar",
    credit: {
      title: "Ташкент, Мироншах 92",
      author: "Nikolai Bulykin",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:%D0%A2%D0%B0%D1%88%D0%BA%D0%B5%D0%BD%D1%82,_%D0%9C%D0%B8%D1%80%D0%BE%D0%BD%D1%88%D0%B0%D1%85_92.jpg",
    },
  },
  tashkentCitySkyline: {
    image: tashkentCitySkyline,
    alt: "Toshkent: bog‘lar ortida Tashkent City majmuasining ko‘p qavatli binolari",
    credit: {
      title: "Tashkent, Tashkent City from Hotel Shodlik Palace",
      author: "Carl Ha",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Tashkent,_Tashkent_City_from_Hotel_Shodlik_Palace.jpg",
    },
  },
  livingRoomModern: {
    image: livingRoomModern,
    alt: "Yorug‘ mehmonxona: yumshoq divan va balkonga chiqadigan katta deraza",
    credit: {
      title: "Modern living room with stylish furniture and a view of the outdoors",
      author: "Shixart1985",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Modern_living_room_with_stylish_furniture_and_a_view_of_the_outdoors_in_a_cozy_apartment_setting.jpg",
    },
  },
  livingRoomEmpty: {
    image: livingRoomEmpty,
    alt: "Parket polli keng xona va ochiq oshxona",
    credit: {
      title: "Empty apartment in Berlin with a fitted kitchen",
      author: "SmashingIt99",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Empty_apartment_in_Berlin_with_fitted_kitchen,_chair_and_plant.jpg",
    },
  },
  kitchenOpenPlan: {
    image: kitchenOpenPlan,
    alt: "Mehmonxonaga ochiladigan oq oshxona",
    credit: {
      title: "Open-plan kitchen in an apartment, Brisbane",
      author: "Chris Olszewski",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Kitchen,_Interior_of_apartment_in_Brisbane,_2025,_03.jpg",
    },
  },
  kitchenFitted: {
    image: kitchenFitted,
    alt: "Gaz plitasi va kir yuvish mashinasi o‘rnatilgan ixcham oshxona",
    credit: {
      title: "Fitted kitchen in an apartment, Goldwin Heights, Hong Kong",
      author: "SeymourGoldwin",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      source:
        "https://commons.wikimedia.org/wiki/File:HK_Mid-levels_2_Seymour_Road_%E9%AB%98%E9%9B%B2%E8%87%BA_Goldwin_Heights_Kitchen_interior_Oct-11-2010.JPG",
    },
  },
  kitchenSimple: {
    image: kitchenSimple,
    alt: "Yog‘och shkafli oddiy oshxona va muzlatkich",
    credit: {
      title: "Kitchen in an apartment, Riverside Plaza, Minneapolis",
      author: "August Schwerdfeger",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Riverside_Plaza_2014-08-26_-_apartment_interior_4.jpg",
    },
  },
  bedroomModern: {
    image: bedroomModern,
    alt: "Geometrik naqshli devor va oq choyshabli yotoqxona",
    credit: {
      title: "Bedroom with geometric wall panelling and soft linens",
      author: "Shixart1985",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Modern_bedroom_design_in_a_stylish_hotel_room_featuring_geometric_patterns_and_soft_linens.jpg",
    },
  },
  bedroomCozy: {
    image: bedroomCozy,
    alt: "Kunduzgi yorug‘likdagi yotoqxona: yumshoq yostiqlar va qalin pardalar",
    credit: {
      title: "Bedroom with plush pillows and drapes in bright daylight",
      author: "Shixart1985",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0",
      source:
        "https://commons.wikimedia.org/wiki/File:Cozy_modern_bedroom_with_plush_pillows_and_elegant_drapes_in_bright_daylight.jpg",
    },
  },
  bathroomCompact: {
    image: bathroomCompact,
    alt: "Ixcham hammom",
    credit: {
      title: "Compact bathroom in an apartment, Karlsruhe",
      author: "Lmqay",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0",
      source: "https://commons.wikimedia.org/wiki/File:Very_small_bathroom_in_Karlsruhe,_Germany.jpg",
    },
  },
} satisfies Record<string, Photo>;

export type PhotoId = keyof typeof PHOTOS;

/** A bundled photograph in the shape listing components consume. */
export function toListingImage(id: PhotoId): ListingImage {
  const { image, alt } = PHOTOS[id];
  return {
    src: image.src,
    width: image.width,
    height: image.height,
    blurDataURL: image.blurDataURL,
    alt,
    remote: false,
  };
}
