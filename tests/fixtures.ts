export const PROPERTY_ID = "11111111-1111-4111-8111-111111111111";
export const LISTING_ID = "22222222-2222-4222-8222-222222222222";

/** Synthetic data only: no real listings, people, credentials or external requests. */
export function apiRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: PROPERTY_ID,
    listing_id: LISTING_ID,
    title: "Regression fixture",
    listing_type: "rent",
    rent_period: "night",
    property_type: "apartment",
    price: { amount: "250000.00", currency: "UZS" },
    location: { point: { latitude: 41.31, longitude: 69.28 } },
    ...overrides,
  };
}
