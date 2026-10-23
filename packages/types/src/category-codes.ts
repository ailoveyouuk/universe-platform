/**
 * Mapping from the Universe product categories to Harmonized System (HS) codes (2026-10-23).
 *
 * Purpose: a supplier declares scope by ticking a shallow Universe category; a buyer may search by HS code. This table connects
 * the two, so neither has to work with the HS tree directly. Codes are kept at 4-digit HEADING level wherever possible because
 * subheadings are renumbered between editions (HS 2017 to HS 2022 changed 3002 and 3822; HS 2028 comes into force on 1 January
 * 2028 and restructures 3003/3004). A 6-digit entry is used only to narrow a heading that spans unrelated goods (for example
 * 9018.31 syringes within 9018) and may need review at each edition change.
 *
 * `basis`: "WCO" = the code appears in the WCO/WHO "HS classification reference for COVID-19 medical supplies" (Edition 2, based on
 * HS 2017); "JUDGEMENT" = chosen by us from the HS structure and not in that list. Neither is legal classification advice:
 * customs administrations assign final national codes.
 *
 * UNSPSC is deliberately NOT mapped here: its use needs the UNDP embedding-terms addendum to be signed first (see
 * ProductSourceStandard in @universe/db).
 */
export type CodeBasis = "WCO" | "JUDGEMENT";
export interface CategoryCode { code: string; note: string; basis: CodeBasis }

export const CATEGORY_HS_MAP: Record<string, CategoryCode[]> = {
  Pharmaceuticals: [
    { code: "3002", note: "Vaccines, antisera, immunological products", basis: "JUDGEMENT" },
    { code: "3003", note: "Medicaments, not in measured doses", basis: "JUDGEMENT" },
    { code: "3004", note: "Medicaments in measured doses or retail packs", basis: "WCO" },
    { code: "300660", note: "Chemical contraceptive preparations", basis: "JUDGEMENT" },
  ],
  Diagnostics: [
    { code: "300215", note: "Immunological test kit reagents", basis: "WCO" },
    { code: "3822", note: "Diagnostic or laboratory reagents on a backing, including PCR test kit reagents", basis: "WCO" },
    { code: "902780", note: "Instruments for in vitro diagnosis", basis: "WCO" },
    { code: "300620", note: "Blood-grouping reagents", basis: "JUDGEMENT" },
  ],
  Reagents: [
    { code: "3821", note: "Prepared culture media, including swab and viral transport medium sets", basis: "WCO" },
    { code: "3822", note: "Diagnostic or laboratory reagents", basis: "WCO" },
    { code: "382499", note: "Other chemical preparations", basis: "JUDGEMENT" },
  ],
  "Laboratory Consumables": [
    { code: "7017", note: "Laboratory glassware", basis: "JUDGEMENT" },
    { code: "3923", note: "Plastic containers, tubes, stoppers", basis: "JUDGEMENT" },
    { code: "392690", note: "Other plastic articles (pipette tips, racks)", basis: "JUDGEMENT" },
  ],
  "Medical Devices": [
    { code: "9018", note: "Instruments and appliances for medical, surgical or veterinary use", basis: "WCO" },
    { code: "9019", note: "Oxygen therapy, ventilators, humidifiers", basis: "WCO" },
    { code: "9021", note: "Orthopaedic appliances, hearing aids", basis: "JUDGEMENT" },
    { code: "9025", note: "Thermometers", basis: "WCO" },
    { code: "9026", note: "Flow meters (oxygen flowmeter)", basis: "WCO" },
    { code: "9402", note: "Medical and surgical furniture", basis: "WCO" },
    { code: "8713", note: "Wheelchairs", basis: "WCO" },
    { code: "841319", note: "Infusion pumps", basis: "WCO" },
    { code: "842139", note: "Oxygen plants (pressure swing adsorption)", basis: "WCO" },
    { code: "841920", note: "Medical and laboratory sterilisers, autoclaves", basis: "WCO" },
    { code: "870590", note: "Mobile clinics and mobile radiological vehicles", basis: "WCO" },
  ],
  "Surgical Supplies": [
    { code: "901831", note: "Syringes, with or without needles", basis: "WCO" },
    { code: "901832", note: "Tubular metal needles and suture needles", basis: "WCO" },
    { code: "901839", note: "Catheters, cannulae, airways and similar", basis: "WCO" },
    { code: "901890", note: "Other medical instruments, intubation and surgical kits", basis: "WCO" },
    { code: "300610", note: "Sterile surgical suture materials, haemostatics", basis: "JUDGEMENT" },
    { code: "3005", note: "Surgical gauze, swabs and dressings", basis: "JUDGEMENT" },
  ],
  "Wound Care": [
    { code: "3005", note: "Wadding, gauze, bandages, dressings, adhesive plasters", basis: "WCO" },
    { code: "300610", note: "Sterile suture materials and tissue adhesives", basis: "JUDGEMENT" },
  ],
  Imaging: [
    { code: "9022", note: "X-ray and CT apparatus", basis: "WCO" },
    { code: "901812", note: "Ultrasonic scanning apparatus", basis: "WCO" },
    { code: "901813", note: "Magnetic resonance imaging apparatus", basis: "JUDGEMENT" },
    { code: "901814", note: "Scintigraphic apparatus", basis: "JUDGEMENT" },
  ],
  "Personal Protective Equipment": [
    { code: "4015", note: "Rubber gloves, including surgical gloves and garments", basis: "WCO" },
    { code: "392620", note: "Plastic gloves, aprons, face shields and protective garments", basis: "WCO" },
    { code: "6307", note: "Made-up textile articles, including surgical masks and respirators", basis: "WCO" },
    { code: "6210", note: "Protective garments of felt or nonwovens or coated fabrics", basis: "WCO" },
    { code: "6216", note: "Textile gloves", basis: "WCO" },
    { code: "6116", note: "Knitted gloves coated with plastics or rubber", basis: "WCO" },
    { code: "6505", note: "Hair nets", basis: "WCO" },
    { code: "4818", note: "Paper masks, gowns and shoe covers", basis: "WCO" },
    { code: "9004", note: "Protective spectacles and goggles", basis: "WCO" },
    { code: "9020", note: "Breathing appliances and gas masks", basis: "WCO" },
  ],
  "Cold Chain": [
    { code: "8418", note: "Refrigerating and freezing equipment, including vaccine refrigerators", basis: "JUDGEMENT" },
    { code: "392310", note: "Plastic boxes and cases (cold boxes, vaccine carriers)", basis: "JUDGEMENT" },
    { code: "9025", note: "Temperature loggers and thermometers", basis: "JUDGEMENT" },
  ],
};

export function normaliseHs(raw: string): string { return raw.replace(/[^0-9]/g, ""); }

/** Categories whose mapped codes cover this HS code (4-digit headings match any subheading beneath them). Several can match. */
export function categoriesForHs(hs: string): string[] {
  const code = normaliseHs(hs);
  if (code.length < 4) return [];
  const out: string[] = [];
  for (const [category, entries] of Object.entries(CATEGORY_HS_MAP)) {
    if (entries.some((e) => code.startsWith(e.code))) out.push(category);
  }
  return out;
}

/** The code prefixes that imply a category, for searching products or suppliers by category. */
export function hsPrefixesForCategory(category: string): string[] {
  return (CATEGORY_HS_MAP[category] ?? []).map((e) => e.code);
}
