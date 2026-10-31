import { TASHKENT_DISTRICTS } from "@/lib/listings/filters";

/** Autocomplete suggestions for location inputs; free text is still accepted. */
export function DistrictSuggestions({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {TASHKENT_DISTRICTS.map((district) => (
        <option key={district.value} value={district.label} />
      ))}
    </datalist>
  );
}
