/**
 * Noun-specific data for the eight product groups added on 2026-10-24, so a simulated product's name, HS code, unit and pack size all
 * fit the product itself (a BCG vaccine never carries a syringe code). `a` and `b` are the two spec positions in the generated name
 * "noun, a, b #N"; no spec may contain a comma (the family step parses names on commas). HS codes sit inside the group's CATEGORY_HS_MAP.
 * UNSPSC is kept at segment/family level and is approximate (simulated data).
 */
export interface GroupItem { noun: string; a: string[]; b: string[]; hs: string; unspsc: string; unit: string; pack: string[] }

export const GROUP_ITEMS: Record<string, GroupItem[]> = {
  "Reproductive Health": [
    { noun: "male condom", a: ["lubricated", "non-lubricated", "flavoured"], b: ["box of 100", "pack of 144", "carton of 1000"], hs: "401410", unspsc: "42000000", unit: "Box of 100", pack: ["Box of 100", "Pack of 144", "Carton of 1000"] },
    { noun: "female condom", a: ["nitrile", "polyurethane"], b: ["box of 100", "pack of 144"], hs: "401410", unspsc: "42000000", unit: "Box of 100", pack: ["Box of 100", "Pack of 144"] },
    { noun: "copper IUD", a: ["T-shaped 380A", "T-shaped 380Ag"], b: ["single sterile pack", "box of 10"], hs: "901890", unspsc: "42000000", unit: "Each", pack: ["Single sterile pack", "Box of 10"] },
    { noun: "levonorgestrel implant", a: ["two-rod 75 mg"], b: ["single dose kit", "box of 5"], hs: "300660", unspsc: "51000000", unit: "Each", pack: ["Single dose kit", "Box of 5"] },
    { noun: "medroxyprogesterone injectable", a: ["150 mg per mL", "104 mg per 0.65 mL"], b: ["single-dose vial", "box of 25 vials"], hs: "300660", unspsc: "51000000", unit: "Vial", pack: ["Box of 25 vials", "Box of 100 vials"] },
    { noun: "combined oral contraceptive", a: ["28-day cycle", "21-day cycle"], b: ["pack of 3 cycles", "carton of 100 cycles"], hs: "300660", unspsc: "51000000", unit: "Cycle pack", pack: ["Pack of 3 cycles", "Carton of 100 cycles"] },
    { noun: "emergency contraceptive pill", a: ["levonorgestrel 1.5 mg", "ulipristal 30 mg"], b: ["blister of 1", "box of 50"], hs: "300660", unspsc: "51000000", unit: "Blister", pack: ["Box of 50", "Box of 100"] },
    { noun: "progestin-only pill", a: ["norethisterone 350 mcg", "levonorgestrel 30 mcg"], b: ["28-day cycle", "carton of 100 cycles"], hs: "300660", unspsc: "51000000", unit: "Cycle pack", pack: ["Pack of 3 cycles", "Carton of 100 cycles"] },
  ],
  Nutrition: [
    { noun: "ready-to-use therapeutic food", a: ["peanut-based paste", "lipid-based paste"], b: ["92 g sachet", "carton of 150 sachets"], hs: "210690", unspsc: "50000000", unit: "Sachet", pack: ["Carton of 150 sachets"] },
    { noun: "multiple micronutrient powder", a: ["15 micronutrients", "with iron"], b: ["1 g sachet", "box of 60 sachets"], hs: "210690", unspsc: "50000000", unit: "Sachet", pack: ["Box of 60 sachets", "Carton of 1000 sachets"] },
    { noun: "vitamin A capsule", a: ["100000 IU", "200000 IU"], b: ["bottle of 500", "bottle of 1000"], hs: "300450", unspsc: "51000000", unit: "Bottle", pack: ["Bottle of 500", "Bottle of 1000"] },
    { noun: "iron and folic acid tablet", a: ["60 mg iron with 400 mcg folic acid", "30 mg iron with 400 mcg folic acid"], b: ["bottle of 100", "bottle of 1000"], hs: "300450", unspsc: "51000000", unit: "Bottle", pack: ["Bottle of 100", "Bottle of 1000"] },
    { noun: "fortified blended food", a: ["corn soya blend", "wheat soya blend"], b: ["25 kg sack", "50 kg sack"], hs: "190190", unspsc: "50000000", unit: "Sack", pack: ["Sack of 25 kg", "Sack of 50 kg"] },
    { noun: "ready-to-use supplementary food", a: ["peanut-based", "lipid-based"], b: ["50 g sachet", "carton of 150 sachets"], hs: "210690", unspsc: "50000000", unit: "Sachet", pack: ["Carton of 150 sachets"] },
    { noun: "infant formula", a: ["starter 0 to 6 months", "follow-on 6 to 12 months"], b: ["400 g tin", "carton of 12 tins"], hs: "190110", unspsc: "50000000", unit: "Tin", pack: ["Carton of 12 tins"] },
    { noun: "therapeutic milk", a: ["F-75", "F-100"], b: ["410 g tin", "carton of 24 tins"], hs: "190110", unspsc: "50000000", unit: "Tin", pack: ["Carton of 24 tins"] },
  ],
  "Vector Control": [
    { noun: "long-lasting insecticidal net", a: ["rectangular 180 x 190 cm", "rectangular 160 x 180 cm", "conical 180 x 190 cm"], b: ["bale of 50", "bale of 40"], hs: "630499", unspsc: "10191500", unit: "Each", pack: ["Bale of 50", "Bale of 40"] },
    { noun: "indoor residual spray insecticide", a: ["pirimiphos-methyl 300 CS", "clothianidin 50 WG", "deltamethrin 25 WG"], b: ["1 L bottle", "10 kg drum"], hs: "380891", unspsc: "10191500", unit: "Bottle", pack: ["Carton of 12 bottles", "Drum of 10 kg"] },
    { noun: "larvicide tablet", a: ["pyriproxyfen 0.5 percent", "Bti 50 mg"], b: ["tub of 100", "tub of 500"], hs: "380891", unspsc: "10191500", unit: "Tub", pack: ["Tub of 100", "Tub of 500"] },
    { noun: "compression sprayer", a: ["10 L", "15 L"], b: ["stainless steel tank", "polyethylene tank"], hs: "842441", unspsc: "10191500", unit: "Each", pack: ["1 unit", "Carton of 4"] },
  ],
  "Water, Sanitation and Hygiene": [
    { noun: "water purification tablet", a: ["67 mg NaDCC", "167 mg NaDCC", "8.5 mg NaDCC"], b: ["strip of 10", "tub of 500"], hs: "380894", unspsc: "47100000", unit: "Tub", pack: ["Tub of 500", "Carton of 50 strips"] },
    { noun: "chlorine granules", a: ["calcium hypochlorite 65 percent", "NaDCC 60 percent"], b: ["1 kg tub", "25 kg drum"], hs: "282890", unspsc: "47100000", unit: "Tub", pack: ["Tub of 1 kg", "Drum of 25 kg"] },
    { noun: "ceramic water filter", a: ["20 L", "10 L"], b: ["with tap", "with receptacle"], hs: "842121", unspsc: "47100000", unit: "Each", pack: ["1 unit", "Carton of 4"] },
    { noun: "hygiene kit", a: ["family of 5 for 1 month", "individual for 1 month"], b: ["standard", "with menstrual hygiene items"], hs: "340119", unspsc: "47000000", unit: "Kit", pack: ["1 kit", "Pallet of 100 kits"] },
    { noun: "handwashing station", a: ["foot-operated", "tap and bucket"], b: ["20 L", "60 L"], hs: "392410", unspsc: "47000000", unit: "Each", pack: ["1 unit"] },
    { noun: "bar soap", a: ["150 g", "200 g"], b: ["carton of 100", "carton of 288"], hs: "340111", unspsc: "47000000", unit: "Bar", pack: ["Carton of 100", "Carton of 288"] },
    { noun: "sanitation slab", a: ["plastic", "reinforced plastic"], b: ["1 m square", "1.2 m square"], hs: "392290", unspsc: "47000000", unit: "Each", pack: ["1 unit"] },
    { noun: "flocculant-disinfectant sachet", a: ["4 g for 10 L", "4 g for 20 L"], b: ["box of 100", "carton of 600"], hs: "380894", unspsc: "47100000", unit: "Sachet", pack: ["Box of 100", "Carton of 600"] },
  ],
  Immunisation: [
    { noun: "measles vaccine", a: ["10-dose vial lyophilised", "5-dose vial lyophilised"], b: ["with diluent", "box of 50 vials"], hs: "300290", unspsc: "51200000", unit: "Vial", pack: ["Box of 50 vials"] },
    { noun: "BCG vaccine", a: ["20-dose ampoule", "10-dose ampoule"], b: ["with diluent", "box of 10 ampoules"], hs: "300290", unspsc: "51200000", unit: "Ampoule", pack: ["Box of 10 ampoules"] },
    { noun: "pentavalent vaccine", a: ["liquid 10-dose vial", "liquid 1-dose vial"], b: ["box of 10 vials", "box of 50 vials"], hs: "300290", unspsc: "51200000", unit: "Vial", pack: ["Box of 10 vials", "Box of 50 vials"] },
    { noun: "oral polio vaccine", a: ["bivalent 20-dose vial", "bivalent 10-dose vial"], b: ["box of 25 vials", "box of 50 vials"], hs: "300290", unspsc: "51200000", unit: "Vial", pack: ["Box of 25 vials", "Box of 50 vials"] },
    { noun: "rotavirus vaccine", a: ["oral liquid 1-dose", "oral liquid 5-dose"], b: ["box of 25", "box of 50"], hs: "300290", unspsc: "51200000", unit: "Dose", pack: ["Box of 25", "Box of 50"] },
    { noun: "auto-disable syringe", a: ["0.5 mL with 23G 25 mm needle", "0.05 mL with 26G 10 mm needle", "0.1 mL with 26G 10 mm needle"], b: ["box of 100", "box of 200"], hs: "901831", unspsc: "42142500", unit: "Box of 100", pack: ["Box of 100", "Box of 200"] },
    { noun: "reconstitution syringe", a: ["2 mL with 21G needle", "5 mL with 21G needle"], b: ["box of 100", "box of 50"], hs: "901831", unspsc: "42142500", unit: "Box of 100", pack: ["Box of 100", "Box of 50"] },
    { noun: "safety box", a: ["5 L", "10 L"], b: ["box of 25", "pack of 50 flat"], hs: "392310", unspsc: "42142500", unit: "Each", pack: ["Box of 25", "Pack of 50 flat"] },
  ],
  "Kits and Emergency Supplies": [
    { noun: "emergency health kit", a: ["basic unit", "supplementary unit"], b: ["for 1000 people for 3 months", "for 10000 people for 3 months"], hs: "300650", unspsc: "42170000", unit: "Kit", pack: ["1 kit"] },
    { noun: "inter-agency reproductive health kit", a: ["kit 1 condoms", "kit 2 clean delivery", "kit 3 rape treatment"], b: ["community level", "health centre level"], hs: "300650", unspsc: "42170000", unit: "Kit", pack: ["1 kit"] },
    { noun: "dignity kit", a: ["women and girls", "adolescent girls"], b: ["standard", "with solar torch"], hs: "300650", unspsc: "42170000", unit: "Kit", pack: ["1 kit", "Pack of 10 kits"] },
    { noun: "cholera treatment kit", a: ["community level", "health centre level"], b: ["for 50 cases", "for 100 cases"], hs: "300650", unspsc: "42170000", unit: "Kit", pack: ["1 kit"] },
    { noun: "PEP kit", a: ["adult 28-day", "paediatric 28-day"], b: ["single kit", "box of 10 kits"], hs: "300650", unspsc: "42170000", unit: "Kit", pack: ["1 kit", "Box of 10 kits"] },
    { noun: "male circumcision kit", a: ["disposable", "reusable"], b: ["single kit", "box of 20 kits"], hs: "901890", unspsc: "42170000", unit: "Kit", pack: ["1 kit", "Box of 20 kits"] },
    { noun: "trauma kit", a: ["individual", "vehicle"], b: ["standard", "with tourniquet"], hs: "901890", unspsc: "42170000", unit: "Kit", pack: ["1 kit"] },
    { noun: "first-aid kit", a: ["workplace", "vehicle"], b: ["10 person", "25 person"], hs: "300650", unspsc: "42170000", unit: "Kit", pack: ["1 kit", "Carton of 10 kits"] },
  ],
  "Shelter and Household Items": [
    { noun: "family tent", a: ["4 x 5 m", "5 x 6 m"], b: ["fire-retardant", "standard"], hs: "630622", unspsc: "30000000", unit: "Each", pack: ["1 unit"] },
    { noun: "plastic sheeting", a: ["4 x 6 m", "4 x 60 m roll"], b: ["reinforced", "standard"], hs: "630612", unspsc: "30000000", unit: "Each", pack: ["Bale of 10", "Roll"] },
    { noun: "wool blanket", a: ["150 x 200 cm", "160 x 220 cm"], b: ["bale of 10", "bale of 25"], hs: "630120", unspsc: "52000000", unit: "Each", pack: ["Bale of 10", "Bale of 25"] },
    { noun: "sleeping mat", a: ["polyethylene foam", "woven"], b: ["180 x 60 cm", "190 x 70 cm"], hs: "940490", unspsc: "52000000", unit: "Each", pack: ["Bale of 10"] },
    { noun: "kitchen set", a: ["family set of 8", "family set of 12"], b: ["stainless steel", "enamelled steel"], hs: "732393", unspsc: "52000000", unit: "Set", pack: ["1 set"] },
    { noun: "tool kit", a: ["shelter 8 piece", "construction 12 piece"], b: ["in canvas bag", "in steel box"], hs: "820600", unspsc: "27110000", unit: "Set", pack: ["1 set"] },
    { noun: "shovel", a: ["round point", "square point"], b: ["steel head with wood handle", "steel head with fibreglass handle"], hs: "820110", unspsc: "27110000", unit: "Each", pack: ["Bundle of 10"] },
    { noun: "rope", a: ["polypropylene 10 mm", "polypropylene 6 mm"], b: ["100 m coil", "200 m coil"], hs: "560749", unspsc: "27110000", unit: "Coil", pack: ["Coil of 100 m", "Coil of 200 m"] },
  ],
  "Field and Military Medical": [
    { noun: "field hospital module", a: ["Role 1 aid post", "Role 2 surgical"], b: ["10-bed", "20-bed"], hs: "940620", unspsc: "42000000", unit: "Each", pack: ["1 module"] },
    { noun: "tourniquet", a: ["windlass", "ratchet"], b: ["single", "pack of 10"], hs: "901890", unspsc: "42000000", unit: "Each", pack: ["Pack of 10", "Pack of 50"] },
    { noun: "haemostatic dressing", a: ["kaolin impregnated", "chitosan"], b: ["single", "box of 10"], hs: "300590", unspsc: "42310000", unit: "Each", pack: ["Box of 10"] },
    { noun: "chest seal", a: ["vented", "non-vented"], b: ["pair", "box of 10 pairs"], hs: "300590", unspsc: "42310000", unit: "Pair", pack: ["Box of 10 pairs"] },
    { noun: "casualty stretcher", a: ["folding aluminium", "rigid"], b: ["standard", "with wheels"], hs: "940290", unspsc: "42000000", unit: "Each", pack: ["1 unit"] },
    { noun: "trauma simulator", a: ["adult manikin", "paediatric manikin"], b: ["with wounds", "basic"], hs: "902300", unspsc: "42000000", unit: "Each", pack: ["1 unit"] },
    { noun: "evacuation litter", a: ["poleless", "with poles"], b: ["4 handle", "6 handle"], hs: "940290", unspsc: "42000000", unit: "Each", pack: ["1 unit", "Carton of 5"] },
  ],
};

export const itemFor = (category: string, noun: string): GroupItem | undefined => GROUP_ITEMS[category.split(".")[0]]?.find((i) => i.noun === noun);
/** All spec phrases usable for a noun (used to keep variant labels coherent when two variants collide). */
export const nounSpecs = (category: string, noun: string): string[] | null => { const i = itemFor(category, noun); return i ? [...new Set([...i.a, ...i.b])] : null; };
