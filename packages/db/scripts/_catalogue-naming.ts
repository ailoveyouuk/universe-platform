/** Category-consistent product naming for simulated catalogue entries (shared by the generator and the enrichment). */
import { GROUP_ITEMS } from "./_group-items";

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

// Groups added on 2026-10-24 take their nouns and specs from the noun-specific item tables (Logistics and Services has no products).
for (const [group, items] of Object.entries(GROUP_ITEMS)) NAMING[group] = { nouns: items.map((i) => i.noun), specs: [...new Set(items.flatMap((i) => [...i.a, ...i.b]))] };
