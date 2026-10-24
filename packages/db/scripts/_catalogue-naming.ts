/** Category-consistent product naming for simulated catalogue entries (shared by the generator and the enrichment). */
export const NAMING: Record<string, { nouns: string[]; specs: string[] }> = {
  "Laboratory Consumables": { nouns: ["cryovial", "pipette tip", "centrifuge tube", "specimen container", "microplate", "petri dish"], specs: ["sterile", "non-sterile", "2 mL", "5 mL", "10 mL", "pack of 500", "pack of 100"] },
  Diagnostics: { nouns: ["rapid test kit", "malaria RDT", "HIV test strip", "glucose test strip", "pregnancy test", "ELISA kit"], specs: ["25 tests", "50 tests", "96 tests", "WHO-PQ", "ISO 13485", "room-temperature stable"] },
  "Medical Devices": { nouns: ["pulse oximeter", "digital thermometer", "infusion pump", "blood pressure monitor", "nebuliser", "oxygen concentrator"], specs: ["adult", "paediatric", "ISO 13485", "battery powered", "WHO-PQ", "portable"] },
  Pharmaceuticals: { nouns: ["amoxicillin tablets", "paracetamol tablets", "oral rehydration salts", "artemether injection", "ibuprofen tablets", "zinc dispersible tablets"], specs: ["500 mg", "250 mg", "100 mL", "WHO-PQ", "pack of 100", "blister pack of 10"] },
  "Personal Protective Equipment": { nouns: ["examination gloves", "face mask", "isolation gown", "face shield", "shoe covers", "N95 respirator"], specs: ["size S", "size M", "size L", "powder-free", "latex-free", "non-sterile", "box of 100"] },
  "Cold Chain": { nouns: ["vaccine carrier", "cold box", "temperature data logger", "ice pack", "vaccine refrigerator", "freezer"], specs: ["2-8 °C", "-20 °C", "WHO-PQS", "20 L", "pack of 4", "solar powered"] },
  Reagents: { nouns: ["culture medium", "staining solution", "buffer solution", "PCR master mix", "lysis reagent", "Gram stain kit"], specs: ["500 mL", "100 mL", "ISO 13485", "pack of 10", "sterile-filtered", "molecular grade"] },
  "Surgical Supplies": { nouns: ["surgical scalpel", "suture", "surgical drape", "urinary catheter", "forceps", "surgical gown"], specs: ["sterile", "single-use", "size 3-0", "pack of 10", "ISO 13485", "box of 25"] },
  "Wound Care": { nouns: ["adhesive bandage", "gauze swab", "wound dressing", "compression bandage", "sterile swab", "hydrocolloid dressing"], specs: ["sterile", "10x15 cm", "box of 50", "non-adherent", "latex-free", "pack of 100"] },
  Imaging: { nouns: ["X-ray film", "ultrasound gel", "imaging cassette", "contrast medium", "lead apron", "ultrasound probe cover"], specs: ["35x43 cm", "24x30 cm", "digital", "ISO 13485", "sterile", "pack of 100"] },
  // Added 2026-10-24 (docs/CATALOGUE-CATEGORY-ANALYSIS.md). Logistics and Services is deliberately absent: services are not catalogue products.
  "Reproductive Health": { nouns: ["male condom", "female condom", "copper IUD", "levonorgestrel implant", "medroxyprogesterone injectable", "combined oral contraceptive", "emergency contraceptive pill", "progestin-only pill"], specs: ["lubricated", "non-lubricated", "pack of 144", "box of 100", "3-month dose", "28-day cycle", "WHO-PQ", "ISO 4074"] },
  Nutrition: { nouns: ["ready-to-use therapeutic food", "multiple micronutrient powder", "vitamin A capsule", "iron and folic acid tablet", "fortified blended food", "ready-to-use supplementary food", "infant formula", "therapeutic milk F-75"], specs: ["92 g sachet", "500 g", "carton of 150", "100,000 IU", "200,000 IU", "60 tablets", "25 kg sack", "400 g tin"] },
  "Vector Control": { nouns: ["long-lasting insecticidal net", "indoor residual spray insecticide", "larvicide tablet", "compression sprayer", "treated mosquito net"], specs: ["180 x 190 cm", "rectangular", "conical", "WHO-PQ", "bale of 50", "10 L", "sachet of 100 g", "pack of 25"] },
  "Water, Sanitation and Hygiene": { nouns: ["water purification tablet", "chlorine granules", "ceramic water filter", "hygiene kit", "handwashing station", "jerrycan", "bar soap", "sanitation slab", "flocculant-disinfectant sachet"], specs: ["strip of 10", "tub of 100", "20 L", "10 L", "box of 48", "pack of 100", "1 kg", "family size"] },
  Immunisation: { nouns: ["measles vaccine", "BCG vaccine", "pentavalent vaccine", "oral polio vaccine", "rotavirus vaccine", "auto-disable syringe", "reconstitution syringe", "safety box"], specs: ["10-dose vial", "20-dose vial", "0.5 mL", "0.05 mL", "WHO-PQ", "box of 100", "5 L", "25 L"] },
  "Kits and Emergency Supplies": { nouns: ["emergency health kit", "inter-agency reproductive health kit", "dignity kit", "cholera treatment kit", "PEP kit", "male circumcision kit", "trauma kit", "first-aid kit"], specs: ["basic", "supplementary", "for 10,000 people", "for 30,000 people", "module A", "module B", "pack of 5", "1 kit"] },
  "Shelter and Household Items": { nouns: ["family tent", "plastic sheeting", "wool blanket", "sleeping mat", "kitchen set", "tool kit", "shovel", "rope"], specs: ["4 x 5 m", "6 x 4 m", "150 x 200 cm", "roll of 50 m", "set of 8", "bundle of 10", "heavy-duty", "fire-retardant"] },
  "Field and Military Medical": { nouns: ["field hospital module", "tourniquet", "haemostatic dressing", "chest seal", "casualty stretcher", "trauma simulator", "evacuation litter", "medical shelter"], specs: ["Role 1", "Role 2", "10-bed", "single-use", "folding", "military grade", "adult", "pack of 10"] },
};


/** HS code for a simulated Imaging product, from its noun (2026-10-24): consumables carry consumable codes, accessories carry the apparatus code. */
export function imagingHs(name: string): string | null {
  const n = name.toLowerCase();
  if (/x-ray film/.test(n)) return "370110";
  if (/gel/.test(n)) return "300670";
  if (/contrast/.test(n)) return "300630";
  if (/cassette|lead apron/.test(n)) return "902290";
  if (/probe cover/.test(n)) return "901812";
  return null;
}
