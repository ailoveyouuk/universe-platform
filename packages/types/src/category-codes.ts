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
    { code: "9020", note: "Breathing appliances (respiratory care)", basis: "WCO" },
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
    { code: "380894", note: "Disinfectant and antiseptic preparations, hand sanitiser", basis: "WCO" },
  ],
  Imaging: [
    { code: "9022", note: "X-ray and CT apparatus", basis: "WCO" },
    { code: "901812", note: "Ultrasonic scanning apparatus", basis: "WCO" },
    { code: "901813", note: "Magnetic resonance imaging apparatus", basis: "JUDGEMENT" },
    { code: "901814", note: "Scintigraphic apparatus", basis: "JUDGEMENT" },
    { code: "3701", note: "Photographic plates and film (X-ray film)", basis: "JUDGEMENT" },
    { code: "300630", note: "X-ray contrast preparations", basis: "JUDGEMENT" },
    { code: "300670", note: "Conductive and ultrasound gels", basis: "WCO" },
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
  // ---- Added 2026-10-24 after the buyer category analysis (docs/CATALOGUE-CATEGORY-ANALYSIS.md). Headings only, kept narrow so existing groups do not gain codes. ----
  "Reproductive Health": [
    { code: "901890", note: "Intrauterine contraceptive devices (within the medical instruments heading)", basis: "JUDGEMENT" },
    { code: "4014", note: "Hygienic or pharmaceutical articles of vulcanised rubber, including condoms", basis: "JUDGEMENT" },
    { code: "300660", note: "Chemical contraceptive preparations", basis: "JUDGEMENT" },
  ],
  Nutrition: [
    { code: "2106", note: "Food preparations not elsewhere specified (ready-to-use therapeutic food, supplements)", basis: "JUDGEMENT" },
    { code: "1901", note: "Infant food and malt-extract food preparations, fortified blends", basis: "JUDGEMENT" },
    { code: "1904", note: "Prepared foods from cereals (fortified cereal blends)", basis: "JUDGEMENT" },
    { code: "2936", note: "Vitamins and provitamins", basis: "JUDGEMENT" },
    { code: "300450", note: "Medicaments containing vitamins (vitamin A, micronutrient tablets)", basis: "JUDGEMENT" },
  ],
  "Vector Control": [
    { code: "6304", note: "Furnishing articles, including insecticide-treated bed nets", basis: "JUDGEMENT" },
    { code: "5608", note: "Knotted netting of textile materials", basis: "JUDGEMENT" },
    { code: "380891", note: "Insecticides (indoor residual spraying, larvicides)", basis: "JUDGEMENT" },
    { code: "842441", note: "Portable spraying appliances", basis: "JUDGEMENT" },
  ],
  "Water, Sanitation and Hygiene": [
    { code: "380894", note: "Disinfectants (water treatment tablets and solutions)", basis: "WCO" },
    { code: "282890", note: "Hypochlorites and chlorinated compounds", basis: "JUDGEMENT" },
    { code: "842121", note: "Machinery for filtering or purifying water", basis: "JUDGEMENT" },
    { code: "3401", note: "Soap and washing preparations", basis: "JUDGEMENT" },
    { code: "3924", note: "Plastic tableware, kitchenware and household articles (buckets, containers)", basis: "JUDGEMENT" },
    { code: "3922", note: "Plastic lavatory seats, sanitation fittings", basis: "JUDGEMENT" },
  ],
  Immunisation: [
    { code: "3002", note: "Vaccines, antisera and immunological products", basis: "JUDGEMENT" },
    { code: "901831", note: "Syringes, including auto-disable immunisation syringes", basis: "WCO" },
    { code: "392310", note: "Plastic boxes (safety boxes for used syringes)", basis: "JUDGEMENT" },
  ],
  "Kits and Emergency Supplies": [
    { code: "300650", note: "First-aid boxes and kits", basis: "JUDGEMENT" },
    { code: "901890", note: "Medical instruments, including procedural and trauma kits", basis: "WCO" },
  ],
  "Shelter and Household Items": [
    { code: "6306", note: "Tarpaulins, tents and awnings", basis: "JUDGEMENT" },
    { code: "6301", note: "Blankets and travelling rugs", basis: "JUDGEMENT" },
    { code: "9404", note: "Mattresses, sleeping bags", basis: "JUDGEMENT" },
    { code: "7323", note: "Table, kitchen or household articles of iron or steel", basis: "JUDGEMENT" },
    { code: "8201", note: "Hand tools: spades, shovels, picks, axes", basis: "JUDGEMENT" },
    { code: "5607", note: "Twine, cordage, ropes", basis: "JUDGEMENT" },
    { code: "8206", note: "Tools of two or more headings put up in sets for retail sale", basis: "JUDGEMENT" },
  ],
  "Field and Military Medical": [
    { code: "9406", note: "Prefabricated buildings (field hospital modules)", basis: "JUDGEMENT" },
    { code: "9023", note: "Instruments for demonstration, including training simulators", basis: "JUDGEMENT" },
    { code: "901890", note: "Medical instruments (tourniquets, trauma equipment)", basis: "WCO" },
    { code: "3005", note: "Wadding, gauze and dressings (haemostatic dressings, chest seals)", basis: "WCO" },
    { code: "9402", note: "Medical furniture, stretchers and litters", basis: "WCO" },
  ],
  "Logistics and Services": [
    { code: "4415", note: "Wooden pallets and packing cases", basis: "JUDGEMENT" },
    { code: "4819", note: "Cartons, boxes and packing containers of paper", basis: "JUDGEMENT" },
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
