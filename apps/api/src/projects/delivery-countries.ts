/**
 * Project delivery countries (2026-10-18): a project can serve several destinations. The full list is stored in
 * Project.deliveryCountryCodes as ",GB,KE," (leading and trailing commas, so an exact filter is `contains: ",KE,"`),
 * and Project.deliveryCountryCode always holds the first one (the primary), so older readers keep working.
 */
export function normaliseCountryCodes(input: ReadonlyArray<string | null | undefined> | null | undefined): string[] {
  const out: string[] = [];
  for (const raw of input ?? []) {
    const c = (raw ?? "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(c) && !out.includes(c)) out.push(c);
  }
  return out;
}

/** The two stored columns for a list of countries (empty list clears both). */
export function deliveryCountryColumns(codes: string[]): { deliveryCountryCode: string | null; deliveryCountryCodes: string | null } {
  return { deliveryCountryCode: codes[0] ?? null, deliveryCountryCodes: codes.length ? `,${codes.join(",")},` : null };
}

/** Reads the list back, falling back to the primary column for rows saved before the list existed. */
export function readDeliveryCountries(row: { deliveryCountryCode: string | null; deliveryCountryCodes?: string | null }): string[] {
  const fromList = normaliseCountryCodes((row.deliveryCountryCodes ?? "").split(","));
  if (fromList.length) return fromList;
  return normaliseCountryCodes([row.deliveryCountryCode]);
}

/** Filter fragment for "projects delivering to this country". */
export function deliversTo(code: string): Record<string, unknown> {
  const c = code.trim().toUpperCase();
  return { OR: [{ deliveryCountryCodes: { contains: `,${c},` } }, { deliveryCountryCodes: null, deliveryCountryCode: c }] };
}
