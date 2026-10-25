import { normaliseHs } from "./category-codes";
import { SERVICE_CATEGORIES, SERVICE_GROUPS } from "./service-categories";

/**
 * Supplier scope of supply (2026-10-23): what a supplier ticks when describing what it can supply. Two levels only: one of the nineteen
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
  { group: "Reproductive Health", subs: [
    { id: "rh-condoms", label: "Male and female condoms", hs: ["4014"], terms: ["condom"] },
    { id: "rh-hormonal", label: "Contraceptive pills, injectables and implants", hs: ["300660"], terms: ["contraceptive", "levonorgestrel", "etonogestrel", "medroxyprogesterone", "progestin", "implant", "injectable", "oral pill", "emergency contraception"] },
    { id: "rh-iud", label: "Intrauterine devices", hs: [], terms: ["iud", "intrauterine"] },
  ] },
  { group: "Nutrition", subs: [
    { id: "nut-rutf", label: "Ready-to-use therapeutic and supplementary foods", hs: ["2106"], terms: ["rutf", "rusf", "therapeutic food", "ready-to-use", "f-75", "f-100", "therapeutic milk"] },
    { id: "nut-micronutrients", label: "Micronutrients and vitamin A", hs: ["2936", "300450"], terms: ["micronutrient", "vitamin a", "multiple micronutrient", "iron and folic", "folic acid", "sprinkles"] },
    { id: "nut-fortified", label: "Fortified blended foods", hs: ["1901", "1904"], terms: ["fortified", "blended food", "corn soya", "wheat soya", "csb"] },
    { id: "nut-infant", label: "Infant feeding", hs: [], terms: ["infant formula", "breast milk substitute", "feeding cup", "baby food"] },
  ] },
  { group: "Vector Control", subs: [
    { id: "vc-nets", label: "Insecticide-treated bed nets", hs: ["6304", "5608"], terms: ["llin", "insecticidal net", "long-lasting", "bed net", "insecticide-treated net", "itn", "mosquito net"] },
    { id: "vc-irs", label: "Indoor residual spraying insecticides", hs: ["380891"], terms: ["indoor residual", "irs", "deltamethrin", "pirimiphos", "clothianidin", "insecticide"] },
    { id: "vc-larvicide", label: "Larvicides", hs: [], terms: ["larvicide", "temephos", "pyriproxyfen", "bti"] },
    { id: "vc-sprayers", label: "Spraying equipment", hs: ["842441"], terms: ["sprayer", "compression sprayer", "spray pump"] },
  ] },
  { group: "Water, Sanitation and Hygiene", subs: [
    { id: "wash-treatment", label: "Water treatment", hs: ["380894", "282890"], terms: ["chlorine", "water purification", "purification tablet", "aquatabs", "flocculant", "chlorination", "pur sachet"] },
    { id: "wash-filters", label: "Water filters", hs: ["842121"], terms: ["water filter", "ceramic filter", "filtration"] },
    { id: "wash-hygiene", label: "Hygiene items and kits", hs: ["3401", "3924"], terms: ["soap", "hygiene kit", "handwashing", "bucket", "jerrycan", "hand sanitiser"] },
    { id: "wash-sanitation", label: "Sanitation", hs: ["3922"], terms: ["latrine", "toilet", "sanitation slab", "urinal"] },
  ] },
  { group: "Immunisation", subs: [
    { id: "imz-vaccines", label: "Vaccines", hs: [], terms: ["vaccine", "bcg", "measles", "rotavirus", "hpv", "pneumococcal", "opv", "ipv", "pentavalent"] },
    { id: "imz-syringes", label: "Auto-disable and reconstitution syringes", hs: [], terms: ["auto-disable", "ad syringe", "reconstitution syringe", "immunisation syringe"] },
    { id: "imz-safety", label: "Safety boxes and sharps disposal", hs: [], terms: ["safety box", "sharps container", "sharps box"] },
  ] },
  { group: "Kits and Emergency Supplies", subs: [
    { id: "kit-health", label: "Emergency health and first-aid kits", hs: ["300650"], terms: ["emergency health kit", "iehk", "health kit", "first aid kit", "first-aid kit", "trauma kit", "burn kit"] },
    { id: "kit-reproductive", label: "Reproductive health and dignity kits", hs: [], terms: ["dignity kit", "reproductive health kit", "iarh", "clean delivery", "maternal kit", "birth kit"] },
    { id: "kit-hiv", label: "PEP and male circumcision kits", hs: [], terms: ["pep kit", "post-exposure", "vmmc", "circumcision kit"] },
    { id: "kit-outbreak", label: "Outbreak response kits", hs: [], terms: ["cholera", "cholera kit", "ebola kit", "outbreak kit", "diarrhoeal disease kit"] },
  ] },
  { group: "Shelter and Household Items", subs: [
    { id: "shl-shelter", label: "Tents, tarpaulins and plastic sheeting", hs: ["6306"], terms: ["tent", "tarpaulin", "plastic sheeting", "shelter"] },
    { id: "shl-bedding", label: "Blankets, mats and sleeping gear", hs: ["6301", "9404"], terms: ["blanket", "sleeping mat", "mattress", "sleeping bag"] },
    { id: "shl-household", label: "Kitchen and household sets", hs: ["7323"], terms: ["kitchen set", "cooking pot", "household kit", "household set"] },
    { id: "shl-tools", label: "Tools and rope", hs: ["8201", "5607"], terms: ["tool kit", "shovel", "spade", "axe", "rope", "hammer"] },
  ] },
  { group: "Field and Military Medical", subs: [
    { id: "fm-facilities", label: "Field hospitals and deployable facilities", hs: ["9406"], terms: ["field hospital", "role 1", "role 2", "role 3", "deployable", "medical shelter"] },
    { id: "fm-trauma", label: "Trauma and combat casualty care", hs: [], terms: ["tourniquet", "haemostatic", "chest seal", "combat casualty", "ifak", "trauma"] },
    { id: "fm-evacuation", label: "Casualty evacuation and transport", hs: [], terms: ["casevac", "medevac", "evacuation", "litter", "stretcher"] },
    { id: "fm-training", label: "Medical training and simulation", hs: ["9023"], terms: ["simulator", "simulation", "training manikin", "manikin"] },
  ] },
  { group: "Logistics and Services", subs: [
    { id: "ls-packaging", label: "Pallets, shippers and packaging", hs: ["4415", "4819"], terms: ["pallet", "shipper", "carton", "packaging"] },
    { id: "ls-freight", label: "Freight, customs and transport", hs: [], terms: ["freight", "air cargo", "customs", "clearing", "transport service"] },
    { id: "ls-warehousing", label: "Warehousing and distribution", hs: [], terms: ["warehousing", "storage service", "fulfilment", "distribution service"] },
    { id: "ls-biomedical", label: "Biomedical servicing and maintenance", hs: [], terms: ["biomedical", "calibration", "equipment maintenance", "equipment repair"] },
    { id: "ls-testing", label: "Sampling, inspection and testing", hs: [], terms: ["sampling", "inspection service", "quality control testing", "laboratory testing"] },
  ] },
];

/**
 * Services as a supplier scope (2026-10-25, Lewis): services are not catalogue products, so they are a scope group of their own that sits beside the
 * product groups only where a supplier declares what it offers or a buyer looks for one (SUPPLIER_SCOPE_TAXONOMY). The product catalogue, the Product
 * Database categories and the product HS map keep using SCOPE_TAXONOMY, which stays product-only. One subcategory per service group (the nine groups in
 * service-categories.ts); the terms carry the finer service types and their examples so a free-text search lands on the right one.
 */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const SERVICES_SCOPE_GROUP: ScopeGroup = {
  group: "Services",
  subs: SERVICE_GROUPS.map((g) => ({
    id: `svc-${slug(g)}`, label: g, hs: [],
    terms: SERVICE_CATEGORIES.filter((c) => c.group === g).flatMap((c) => [c.label.toLowerCase(), ...c.examples.map((e) => e.toLowerCase())]),
  })),
};
/** Everything a supplier can declare it offers: the product groups and the services. */
export const SUPPLIER_SCOPE_TAXONOMY: ScopeGroup[] = [...SCOPE_TAXONOMY, SERVICES_SCOPE_GROUP];
/** The scope subcategory a service type falls under, for matching a service line to suppliers that declared it. */
export function scopeSubForServiceCategory(code: string): string | null {
  const c = SERVICE_CATEGORIES.find((x) => x.code === code);
  return c ? `svc-${slug(c.group)}` : null;
}

/**
 * WHO ATC classification prefixes to pharmaceutical subcategories (2026-10-23). ATC is the right key for the pharmaceutical subcategories
 * because HS cannot tell an antibiotic from an antimalarial. Longest matching prefix wins. The EMA register supplies an ATC code per
 * medicine, so a catalogue product linked to a register entry can be placed by it. A medicine with no match here is left to the name terms.
 */
/** Groups a catalogue product can be filed under when added by hand: every group except Pharmaceuticals, which has its own form. */
export const PRODUCT_GROUPS_NON_PHARMA: string[] = SCOPE_TAXONOMY.map((g) => g.group).filter((g) => g !== "Pharmaceuticals");

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
  return SUPPLIER_SCOPE_TAXONOMY.find((g) => g.group === group)?.subs ?? [];
}
export function scopeSubById(id: string): { group: string; sub: ScopeSub } | null {
  for (const g of SUPPLIER_SCOPE_TAXONOMY) { const sub = g.subs.find((s) => s.id === id); if (sub) return { group: g.group, sub }; }
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
