import { normaliseHs } from "./category-codes";

/**
 * Supplier scope of supply (2026-10-23): what a supplier ticks when describing what it can supply. Two levels only: one of the ten
 * Universe product groups, then a few broad subcategories. Each subcategory is tied to the back-end schemes that actually identify
 * products, so a buyer can search by group, subcategory, HS code or product name and reach the same suppliers.
 *
 * `hs`: HS code prefixes (4 or 6 digits) that identify the subcategory within its group. Empty where HS cannot tell the difference
 *       (HS 3004 does not separate antibiotics from antimalarials), in which case `terms` carries the match.
 * `terms`: lower-case words matched against a product's name, INN or brand to place it in the subcategory. Product names are
 *       free text, so a term match is a best guess; the catalogue's own "Group.Subgroup" category path wins when present.
 *
 * Each subcategory's HS prefixes must sit within its group's entries in CATEGORY_HS_MAP (enforced by a test).
 */
export interface ScopeSub { id: string; label: string; hs: string[]; terms: string[] }
export interface ScopeGroup { group: string; subs: ScopeSub[] }

export const SCOPE_TAXONOMY: ScopeGroup[] = [
  { group: "Pharmaceuticals", subs: [
    { id: "pharma-antibiotics", label: "Antibiotics and anti-infectives", hs: [], terms: ["amoxicillin", "azithromycin", "ciprofloxacin", "doxycycline", "metronidazole", "cotrimoxazole", "ceftriaxone", "gentamicin", "antibiotic", "penicillin"] },
    { id: "pharma-antimalarials", label: "Antimalarials", hs: [], terms: ["artemether", "artesunate", "lumefantrine", "chloroquine", "primaquine", "sulfadoxine", "amodiaquine", "antimalarial"] },
    { id: "pharma-hiv-tb", label: "HIV, TB and hepatitis", hs: [], terms: ["tenofovir", "dolutegravir", "efavirenz", "lamivudine", "isoniazid", "rifampicin", "pyrazinamide", "ethambutol", "antiretroviral", "sofosbuvir"] },
    { id: "pharma-vaccines", label: "Vaccines and immunologicals", hs: ["3002"], terms: ["vaccine", "immunoglobulin", "antiserum"] },
    { id: "pharma-analgesics", label: "Pain and fever", hs: [], terms: ["paracetamol", "ibuprofen", "diclofenac", "morphine", "analgesic", "aspirin"] },
    { id: "pharma-maternal", label: "Maternal health and contraceptives", hs: ["300660"], terms: ["oxytocin", "misoprostol", "magnesium sulfate", "levonorgestrel", "contraceptive", "ferrous", "folic acid", "implant"] },
    { id: "pharma-endocrine", label: "Diabetes and endocrine", hs: [], terms: ["insulin", "metformin", "glibenclamide", "levothyroxine", "hydrocortisone", "dexamethasone"] },
    { id: "pharma-essential", label: "Rehydration, zinc and other essential medicines", hs: [], terms: ["oral rehydration", "zinc", "salbutamol", "omeprazole", "essential medicine", "vitamin"] },
  ] },
  { group: "Diagnostics", subs: [
    { id: "dx-rapid", label: "Rapid tests", hs: ["300215"], terms: ["rapid", "rdt", "test strip", "pregnancy test", "glucose test", "hiv test", "malaria"] },
    { id: "dx-lab-kits", label: "Laboratory test kits (ELISA, molecular)", hs: ["3822"], terms: ["elisa", "pcr", "test kit", "molecular"] },
    { id: "dx-instruments", label: "Analysers and instruments", hs: ["902780"], terms: ["analyser", "analyzer", "reader", "spectrophotometer", "haematology", "chemistry analyser"] },
    { id: "dx-blood-grouping", label: "Blood grouping and transfusion testing", hs: ["300620"], terms: ["blood group", "typing serum", "coombs"] },
  ] },
  { group: "Reagents", subs: [
    { id: "rg-culture", label: "Culture media", hs: ["3821"], terms: ["culture medium", "agar", "broth", "transport medium"] },
    { id: "rg-stains", label: "Stains and buffers", hs: [], terms: ["stain", "gram", "giemsa", "buffer", "solution"] },
    { id: "rg-molecular", label: "Molecular reagents", hs: ["3822"], terms: ["pcr", "master mix", "lysis", "extraction", "primer"] },
    { id: "rg-chemicals", label: "General laboratory chemicals", hs: ["382499"], terms: ["reagent", "chemical", "ethanol", "sodium"] },
  ] },
  { group: "Laboratory Consumables", subs: [
    { id: "lc-sample", label: "Sample collection", hs: [], terms: ["collection tube", "specimen container", "blood collection", "lancet", "sample collection", "swab"] },
    { id: "lc-storage", label: "Sample storage", hs: [], terms: ["cryovial", "microcentrifuge", "storage box", "sample storage", "freezer box"] },
    { id: "lc-plastics", label: "Pipetting and general plastics", hs: ["3923", "392690"], terms: ["pipette", "centrifuge tube", "microplate", "petri", "tip"] },
    { id: "lc-glass", label: "Laboratory glassware", hs: ["7017"], terms: ["glass", "beaker", "flask", "slide", "cover slip"] },
  ] },
  { group: "Medical Devices", subs: [
    { id: "md-monitoring", label: "Patient monitoring and diagnostic devices", hs: ["901811", "901819", "9025", "9026"], terms: ["oximeter", "thermometer", "blood pressure", "monitor", "stethoscope", "ecg", "glucometer"] },
    { id: "md-respiratory", label: "Oxygen and respiratory care", hs: ["9019", "9020", "842139"], terms: ["oxygen", "ventilator", "nebuliser", "nebulizer", "cpap", "respiratory"] },
    { id: "md-infusion", label: "Infusion and fluid delivery", hs: ["841319"], terms: ["infusion", "iv administration", "drip"] },
    { id: "md-hospital", label: "Hospital equipment and furniture", hs: ["9402"], terms: ["bed", "stretcher", "trolley", "exam table", "hospital"] },
    { id: "md-sterilisation", label: "Sterilisation and decontamination", hs: ["841920"], terms: ["autoclave", "steriliser", "sterilizer", "sterilisation"] },
    { id: "md-mobility", label: "Mobility aids and orthopaedics", hs: ["8713", "9021"], terms: ["wheelchair", "crutch", "walking", "orthopaedic", "hearing aid", "splint"] },
    { id: "md-mobile", label: "Mobile clinics and ambulances", hs: ["870590"], terms: ["mobile clinic", "ambulance"] },
  ] },
  { group: "Surgical Supplies", subs: [
    { id: "ss-syringes", label: "Syringes and needles", hs: ["901831", "901832"], terms: ["syringe", "needle"] },
    { id: "ss-catheters", label: "Catheters, tubes and airways", hs: ["901839"], terms: ["catheter", "cannula", "airway", "tube", "drain"] },
    { id: "ss-instruments", label: "Surgical instruments and kits", hs: ["901890"], terms: ["scalpel", "forceps", "scissors", "retractor", "surgical kit", "instrument"] },
    { id: "ss-sutures", label: "Sutures", hs: ["300610"], terms: ["suture", "catgut"] },
    { id: "ss-drapes", label: "Drapes, gowns and sterile packaging", hs: [], terms: ["drape", "surgical gown", "sterilisation pouch", "pouch", "sharps"] },
  ] },
  { group: "Wound Care", subs: [
    { id: "wc-dressings", label: "Dressings and bandages", hs: ["3005"], terms: ["dressing", "bandage", "hydrocolloid", "compression"] },
    { id: "wc-gauze", label: "Gauze and swabs", hs: ["300590"], terms: ["gauze", "swab", "cotton"] },
    { id: "wc-tapes", label: "Tapes and plasters", hs: ["300510"], terms: ["tape", "plaster", "adhesive"] },
    { id: "wc-antiseptics", label: "Antiseptics and skin preparation", hs: ["380894"], terms: ["antiseptic", "iodine", "chlorhexidine", "alcohol prep", "sanitiser", "sanitizer"] },
  ] },
  { group: "Imaging", subs: [
    { id: "im-xray", label: "X-ray and CT", hs: ["9022"], terms: ["x-ray", "xray", "radiograph", "ct scanner"] },
    { id: "im-ultrasound", label: "Ultrasound", hs: ["901812"], terms: ["ultrasound", "sonograph", "probe"] },
    { id: "im-mri-nuclear", label: "MRI and nuclear imaging", hs: ["901813", "901814"], terms: ["mri", "scintigraph", "nuclear"] },
    { id: "im-consumables", label: "Imaging consumables and protection", hs: ["3701", "300630", "300670"], terms: ["film", "contrast", "gel", "lead apron", "cassette", "cover"] },
  ] },
  { group: "Personal Protective Equipment", subs: [
    { id: "ppe-gloves", label: "Gloves", hs: ["4015", "6216", "6116"], terms: ["glove"] },
    { id: "ppe-masks", label: "Masks and respirators", hs: ["6307", "9020"], terms: ["mask", "respirator", "n95", "ffp"] },
    { id: "ppe-gowns", label: "Gowns and coveralls", hs: ["6210"], terms: ["gown", "coverall", "apron", "isolation"] },
    { id: "ppe-eye-face", label: "Eye and face protection", hs: ["9004"], terms: ["goggle", "face shield", "visor", "spectacle"] },
    { id: "ppe-head-foot", label: "Head and foot covers", hs: ["6505", "4818"], terms: ["shoe cover", "boot", "cap", "hair net", "footwear"] },
  ] },
  { group: "Cold Chain", subs: [
    { id: "cc-refrigeration", label: "Vaccine refrigerators and freezers", hs: ["8418"], terms: ["refrigerator", "freezer", "fridge", "solar"] },
    { id: "cc-boxes", label: "Cold boxes and vaccine carriers", hs: ["392310"], terms: ["cold box", "vaccine carrier", "carrier"] },
    { id: "cc-monitoring", label: "Temperature monitoring", hs: ["9025"], terms: ["data logger", "logger", "temperature monitor", "fridge-tag", "indicator"] },
    { id: "cc-icepacks", label: "Ice packs and coolants", hs: [], terms: ["ice pack", "coolant", "cool pack", "gel pack"] },
  ] },
];

/**
 * WHO ATC classification prefixes to pharmaceutical subcategories (2026-10-23). ATC is the right key for the pharmaceutical subcategories
 * because HS cannot tell an antibiotic from an antimalarial. Longest matching prefix wins. The EMA register supplies an ATC code per
 * medicine, so a catalogue product linked to a register entry can be placed by it. A medicine with no match here is left to the name terms.
 */
export const ATC_SCOPE: [string, string][] = [
  ["J01", "pharma-antibiotics"], ["J02", "pharma-antibiotics"],
  ["P01B", "pharma-antimalarials"],
  ["J04", "pharma-hiv-tb"], ["J05", "pharma-hiv-tb"],
  ["J06", "pharma-vaccines"], ["J07", "pharma-vaccines"],
  ["N02", "pharma-analgesics"], ["M01A", "pharma-analgesics"],
  ["G02", "pharma-maternal"], ["G03", "pharma-maternal"], ["H01BB", "pharma-maternal"],
  ["A10", "pharma-endocrine"], ["H02", "pharma-endocrine"], ["H03", "pharma-endocrine"],
  ["A07CA", "pharma-essential"], ["A11", "pharma-essential"], ["A12", "pharma-essential"], ["R03", "pharma-essential"], ["A02B", "pharma-essential"],
];
export function scopeSubForAtc(atc: string | null | undefined): string | null {
  const code = (atc ?? "").toUpperCase().replace(/\s/g, "");
  if (code.length < 3) return null;
  let best: string | null = null, bestLen = 0;
  for (const [prefix, id] of ATC_SCOPE) if (code.startsWith(prefix) && prefix.length > bestLen) { best = id; bestLen = prefix.length; }
  return best;
}

export function scopeSubsForGroup(group: string): ScopeSub[] {
  return SCOPE_TAXONOMY.find((g) => g.group === group)?.subs ?? [];
}
export function scopeSubById(id: string): { group: string; sub: ScopeSub } | null {
  for (const g of SCOPE_TAXONOMY) { const sub = g.subs.find((s) => s.id === id); if (sub) return { group: g.group, sub }; }
  return null;
}

/**
 * Which subcategories a catalogue product belongs to. Order of evidence: (1) the catalogue category path's subgroup, when it names one
 * of the subcategory labels' key words; (2) HS prefix; (3) terms in the name, INN or brand. Only subcategories of the product's own
 * group are considered. Returns every match (a product can sit in more than one).
 */
export function scopeSubsForProduct(p: { category: string; hsCode?: string | null; name?: string | null; inn?: string | null; brand?: string | null; atcCode?: string | null }): string[] {
  const [group, ...rest] = p.category.split(".");
  const subs = scopeSubsForGroup(group);
  if (subs.length === 0) return [];
  const hs = p.hsCode ? normaliseHs(p.hsCode) : "";
  const text = `${p.name ?? ""} ${p.inn ?? ""} ${p.brand ?? ""} ${rest.join(" ")}`.toLowerCase();
  const out: string[] = [];
  for (const s of subs) {
    const byHs = hs.length >= 4 && s.hs.some((c) => hs.startsWith(c));
    const byTerm = s.terms.some((t) => text.includes(t));
    if (byHs || byTerm) out.push(s.id);
  }
  const byAtc = group === "Pharmaceuticals" ? scopeSubForAtc(p.atcCode) : null;
  if (byAtc && !out.includes(byAtc)) out.push(byAtc);
  return out;
}

/** Subcategories whose HS prefixes cover a code, for searching by HS. */
export function scopeSubsForHs(hsRaw: string): { group: string; id: string }[] {
  const hs = normaliseHs(hsRaw);
  if (hs.length < 4) return [];
  const out: { group: string; id: string }[] = [];
  for (const g of SCOPE_TAXONOMY) for (const s of g.subs) if (s.hs.some((c) => hs.startsWith(c))) out.push({ group: g.group, id: s.id });
  return out;
}
