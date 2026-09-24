/**
 * The six WHO regions and all 194 WHO Member States mapped to them, plus
 * ISO 3166-1 alpha-2 codes — global reference data (Region/Country in
 * schema.prisma), not tenant-scoped, seeded once per environment.
 *
 * Sourced and cross-checked 2026-09-24, not typed from memory:
 *   - The 194-member roll call and English short names: who.int/countries
 *     (live page, fetched directly).
 *   - Regional groupings: Wikipedia's "List of WHO regions" (derived from
 *     WHO's own World Health Statistics), with two gaps found and corrected
 *     against PAHO's own official member list (paho.org, via Wikipedia's
 *     PAHO article, which quotes it with accession years) — that Wikipedia
 *     region list was missing Paraguay and Saint Kitts and Nevis from the
 *     Americas region, and missing Libya from the Eastern Mediterranean
 *     region. All three added here.
 *   - Indonesia is listed under Western Pacific, not South-East Asia —
 *     confirmed deliberate, not a stale-data error: Indonesia formally
 *     moved from WHO's South-East Asia Region to the Western Pacific Region
 *     in 2025 (widely reported — Reuters/Lancet Regional Health-Southeast
 *     Asia/ANTARA/Jakarta Globe all cover the move). If this is ever
 *     re-verified against a fresher source, that's the one prior WHO
 *     regional reassignment to know about.
 *   - Country total by region reconciles exactly to the official 194:
 *     AFRO 47, AMRO 35, SEARO 10, EURO 53, EMRO 21, WPRO 28.
 *
 * Taiwan is not included — it is not a WHO Member State (not a UN member),
 * so it doesn't appear on who.int's own 194-country roll call. If Universe
 * ever needs it as a shippable destination, add it as a Country row with a
 * NULL regionCode (the same pattern already used for entities outside the
 * WHO membership model) rather than forcing it into WPRO.
 *
 * English short names follow WHO's own usage (e.g. "Türkiye", "Czechia",
 * "Côte d'Ivoire") since that's the source this was built from, except
 * where WHO's formal name is unwieldy for a procurement UI — those cases
 * are noted inline.
 */

export interface RegionSeed {
  code: string;
  name: string;
}

export interface CountrySeed {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  regionCode: string;
}

export const REGIONS: RegionSeed[] = [
  { code: "AFRO", name: "African Region" },
  { code: "AMRO", name: "Region of the Americas" },
  { code: "SEARO", name: "South-East Asia Region" },
  { code: "EURO", name: "European Region" },
  { code: "EMRO", name: "Eastern Mediterranean Region" },
  { code: "WPRO", name: "Western Pacific Region" },
];

export const COUNTRIES: CountrySeed[] = [
  // --- AFRO — African Region (47) ---
  { code: "DZ", name: "Algeria", regionCode: "AFRO" },
  { code: "AO", name: "Angola", regionCode: "AFRO" },
  { code: "BJ", name: "Benin", regionCode: "AFRO" },
  { code: "BW", name: "Botswana", regionCode: "AFRO" },
  { code: "BF", name: "Burkina Faso", regionCode: "AFRO" },
  { code: "BI", name: "Burundi", regionCode: "AFRO" },
  { code: "CM", name: "Cameroon", regionCode: "AFRO" },
  { code: "CV", name: "Cabo Verde", regionCode: "AFRO" },
  { code: "CF", name: "Central African Republic", regionCode: "AFRO" },
  { code: "TD", name: "Chad", regionCode: "AFRO" },
  { code: "KM", name: "Comoros", regionCode: "AFRO" },
  { code: "CI", name: "Côte d'Ivoire", regionCode: "AFRO" },
  { code: "CD", name: "Democratic Republic of the Congo", regionCode: "AFRO" },
  { code: "GQ", name: "Equatorial Guinea", regionCode: "AFRO" },
  { code: "ER", name: "Eritrea", regionCode: "AFRO" },
  { code: "SZ", name: "Eswatini", regionCode: "AFRO" },
  { code: "ET", name: "Ethiopia", regionCode: "AFRO" },
  { code: "GA", name: "Gabon", regionCode: "AFRO" },
  { code: "GM", name: "Gambia", regionCode: "AFRO" },
  { code: "GH", name: "Ghana", regionCode: "AFRO" },
  { code: "GN", name: "Guinea", regionCode: "AFRO" },
  { code: "GW", name: "Guinea-Bissau", regionCode: "AFRO" },
  { code: "KE", name: "Kenya", regionCode: "AFRO" },
  { code: "LS", name: "Lesotho", regionCode: "AFRO" },
  { code: "LR", name: "Liberia", regionCode: "AFRO" },
  { code: "MG", name: "Madagascar", regionCode: "AFRO" },
  { code: "MW", name: "Malawi", regionCode: "AFRO" },
  { code: "ML", name: "Mali", regionCode: "AFRO" },
  { code: "MR", name: "Mauritania", regionCode: "AFRO" },
  { code: "MU", name: "Mauritius", regionCode: "AFRO" },
  { code: "MZ", name: "Mozambique", regionCode: "AFRO" },
  { code: "NA", name: "Namibia", regionCode: "AFRO" },
  { code: "NE", name: "Niger", regionCode: "AFRO" },
  { code: "NG", name: "Nigeria", regionCode: "AFRO" },
  { code: "CG", name: "Congo", regionCode: "AFRO" },
  { code: "RW", name: "Rwanda", regionCode: "AFRO" },
  { code: "ST", name: "Sao Tome and Principe", regionCode: "AFRO" },
  { code: "SN", name: "Senegal", regionCode: "AFRO" },
  { code: "SC", name: "Seychelles", regionCode: "AFRO" },
  { code: "SL", name: "Sierra Leone", regionCode: "AFRO" },
  { code: "ZA", name: "South Africa", regionCode: "AFRO" },
  { code: "SS", name: "South Sudan", regionCode: "AFRO" },
  { code: "TG", name: "Togo", regionCode: "AFRO" },
  { code: "UG", name: "Uganda", regionCode: "AFRO" },
  { code: "TZ", name: "United Republic of Tanzania", regionCode: "AFRO" },
  { code: "ZM", name: "Zambia", regionCode: "AFRO" },
  { code: "ZW", name: "Zimbabwe", regionCode: "AFRO" },

  // --- AMRO — Region of the Americas (35) ---
  { code: "AG", name: "Antigua and Barbuda", regionCode: "AMRO" },
  { code: "AR", name: "Argentina", regionCode: "AMRO" },
  { code: "BS", name: "Bahamas", regionCode: "AMRO" },
  { code: "BB", name: "Barbados", regionCode: "AMRO" },
  { code: "BZ", name: "Belize", regionCode: "AMRO" },
  { code: "BO", name: "Bolivia (Plurinational State of)", regionCode: "AMRO" },
  { code: "BR", name: "Brazil", regionCode: "AMRO" },
  { code: "CA", name: "Canada", regionCode: "AMRO" },
  { code: "CL", name: "Chile", regionCode: "AMRO" },
  { code: "CO", name: "Colombia", regionCode: "AMRO" },
  { code: "CR", name: "Costa Rica", regionCode: "AMRO" },
  { code: "CU", name: "Cuba", regionCode: "AMRO" },
  { code: "DM", name: "Dominica", regionCode: "AMRO" },
  { code: "DO", name: "Dominican Republic", regionCode: "AMRO" },
  { code: "EC", name: "Ecuador", regionCode: "AMRO" },
  { code: "SV", name: "El Salvador", regionCode: "AMRO" },
  { code: "GD", name: "Grenada", regionCode: "AMRO" },
  { code: "GT", name: "Guatemala", regionCode: "AMRO" },
  { code: "GY", name: "Guyana", regionCode: "AMRO" },
  { code: "HT", name: "Haiti", regionCode: "AMRO" },
  { code: "HN", name: "Honduras", regionCode: "AMRO" },
  { code: "JM", name: "Jamaica", regionCode: "AMRO" },
  { code: "MX", name: "Mexico", regionCode: "AMRO" },
  { code: "NI", name: "Nicaragua", regionCode: "AMRO" },
  { code: "PA", name: "Panama", regionCode: "AMRO" },
  { code: "PY", name: "Paraguay", regionCode: "AMRO" },
  { code: "PE", name: "Peru", regionCode: "AMRO" },
  { code: "KN", name: "Saint Kitts and Nevis", regionCode: "AMRO" },
  { code: "LC", name: "Saint Lucia", regionCode: "AMRO" },
  { code: "VC", name: "Saint Vincent and the Grenadines", regionCode: "AMRO" },
  { code: "SR", name: "Suriname", regionCode: "AMRO" },
  { code: "TT", name: "Trinidad and Tobago", regionCode: "AMRO" },
  { code: "US", name: "United States of America", regionCode: "AMRO" },
  { code: "UY", name: "Uruguay", regionCode: "AMRO" },
  { code: "VE", name: "Venezuela (Bolivarian Republic of)", regionCode: "AMRO" },

  // --- SEARO — South-East Asia Region (10) ---
  { code: "BD", name: "Bangladesh", regionCode: "SEARO" },
  { code: "BT", name: "Bhutan", regionCode: "SEARO" },
  { code: "KP", name: "Democratic People's Republic of Korea", regionCode: "SEARO" },
  { code: "IN", name: "India", regionCode: "SEARO" },
  { code: "MV", name: "Maldives", regionCode: "SEARO" },
  { code: "MM", name: "Myanmar", regionCode: "SEARO" },
  { code: "NP", name: "Nepal", regionCode: "SEARO" },
  { code: "LK", name: "Sri Lanka", regionCode: "SEARO" },
  { code: "TH", name: "Thailand", regionCode: "SEARO" },
  { code: "TL", name: "Timor-Leste", regionCode: "SEARO" },

  // --- EURO — European Region (53) ---
  { code: "AL", name: "Albania", regionCode: "EURO" },
  { code: "AD", name: "Andorra", regionCode: "EURO" },
  { code: "AM", name: "Armenia", regionCode: "EURO" },
  { code: "AT", name: "Austria", regionCode: "EURO" },
  { code: "AZ", name: "Azerbaijan", regionCode: "EURO" },
  { code: "BY", name: "Belarus", regionCode: "EURO" },
  { code: "BE", name: "Belgium", regionCode: "EURO" },
  { code: "BA", name: "Bosnia and Herzegovina", regionCode: "EURO" },
  { code: "BG", name: "Bulgaria", regionCode: "EURO" },
  { code: "HR", name: "Croatia", regionCode: "EURO" },
  { code: "CY", name: "Cyprus", regionCode: "EURO" },
  { code: "CZ", name: "Czechia", regionCode: "EURO" },
  { code: "DK", name: "Denmark", regionCode: "EURO" },
  { code: "EE", name: "Estonia", regionCode: "EURO" },
  { code: "FI", name: "Finland", regionCode: "EURO" },
  { code: "FR", name: "France", regionCode: "EURO" },
  { code: "GE", name: "Georgia", regionCode: "EURO" },
  { code: "DE", name: "Germany", regionCode: "EURO" },
  { code: "GR", name: "Greece", regionCode: "EURO" },
  { code: "HU", name: "Hungary", regionCode: "EURO" },
  { code: "IS", name: "Iceland", regionCode: "EURO" },
  { code: "IE", name: "Ireland", regionCode: "EURO" },
  { code: "IL", name: "Israel", regionCode: "EURO" },
  { code: "IT", name: "Italy", regionCode: "EURO" },
  { code: "KZ", name: "Kazakhstan", regionCode: "EURO" },
  { code: "KG", name: "Kyrgyzstan", regionCode: "EURO" },
  { code: "LV", name: "Latvia", regionCode: "EURO" },
  { code: "LT", name: "Lithuania", regionCode: "EURO" },
  { code: "LU", name: "Luxembourg", regionCode: "EURO" },
  { code: "MT", name: "Malta", regionCode: "EURO" },
  { code: "MC", name: "Monaco", regionCode: "EURO" },
  { code: "ME", name: "Montenegro", regionCode: "EURO" },
  { code: "NL", name: "Netherlands (Kingdom of the)", regionCode: "EURO" },
  { code: "MK", name: "North Macedonia", regionCode: "EURO" },
  { code: "NO", name: "Norway", regionCode: "EURO" },
  { code: "PL", name: "Poland", regionCode: "EURO" },
  { code: "PT", name: "Portugal", regionCode: "EURO" },
  { code: "MD", name: "Republic of Moldova", regionCode: "EURO" },
  { code: "RO", name: "Romania", regionCode: "EURO" },
  { code: "RU", name: "Russian Federation", regionCode: "EURO" },
  { code: "SM", name: "San Marino", regionCode: "EURO" },
  { code: "RS", name: "Serbia", regionCode: "EURO" },
  { code: "SK", name: "Slovakia", regionCode: "EURO" },
  { code: "SI", name: "Slovenia", regionCode: "EURO" },
  { code: "ES", name: "Spain", regionCode: "EURO" },
  { code: "SE", name: "Sweden", regionCode: "EURO" },
  { code: "CH", name: "Switzerland", regionCode: "EURO" },
  { code: "TJ", name: "Tajikistan", regionCode: "EURO" },
  { code: "TR", name: "Türkiye", regionCode: "EURO" },
  { code: "TM", name: "Turkmenistan", regionCode: "EURO" },
  { code: "UA", name: "Ukraine", regionCode: "EURO" },
  { code: "GB", name: "United Kingdom of Great Britain and Northern Ireland", regionCode: "EURO" },
  { code: "UZ", name: "Uzbekistan", regionCode: "EURO" },

  // --- EMRO — Eastern Mediterranean Region (21) ---
  { code: "AF", name: "Afghanistan", regionCode: "EMRO" },
  { code: "BH", name: "Bahrain", regionCode: "EMRO" },
  { code: "DJ", name: "Djibouti", regionCode: "EMRO" },
  { code: "EG", name: "Egypt", regionCode: "EMRO" },
  { code: "IR", name: "Iran (Islamic Republic of)", regionCode: "EMRO" },
  { code: "IQ", name: "Iraq", regionCode: "EMRO" },
  { code: "JO", name: "Jordan", regionCode: "EMRO" },
  { code: "KW", name: "Kuwait", regionCode: "EMRO" },
  { code: "LB", name: "Lebanon", regionCode: "EMRO" },
  { code: "LY", name: "Libya", regionCode: "EMRO" },
  { code: "MA", name: "Morocco", regionCode: "EMRO" },
  { code: "OM", name: "Oman", regionCode: "EMRO" },
  { code: "PK", name: "Pakistan", regionCode: "EMRO" },
  { code: "QA", name: "Qatar", regionCode: "EMRO" },
  { code: "SA", name: "Saudi Arabia", regionCode: "EMRO" },
  { code: "SO", name: "Somalia", regionCode: "EMRO" },
  { code: "SD", name: "Sudan", regionCode: "EMRO" },
  { code: "SY", name: "Syrian Arab Republic", regionCode: "EMRO" },
  { code: "TN", name: "Tunisia", regionCode: "EMRO" },
  { code: "AE", name: "United Arab Emirates", regionCode: "EMRO" },
  { code: "YE", name: "Yemen", regionCode: "EMRO" },

  // --- WPRO — Western Pacific Region (28) ---
  { code: "AU", name: "Australia", regionCode: "WPRO" },
  { code: "BN", name: "Brunei Darussalam", regionCode: "WPRO" },
  { code: "KH", name: "Cambodia", regionCode: "WPRO" },
  { code: "CN", name: "China", regionCode: "WPRO" },
  { code: "CK", name: "Cook Islands", regionCode: "WPRO" },
  { code: "FJ", name: "Fiji", regionCode: "WPRO" },
  { code: "ID", name: "Indonesia", regionCode: "WPRO" },
  { code: "JP", name: "Japan", regionCode: "WPRO" },
  { code: "KI", name: "Kiribati", regionCode: "WPRO" },
  { code: "LA", name: "Lao People's Democratic Republic", regionCode: "WPRO" },
  { code: "MY", name: "Malaysia", regionCode: "WPRO" },
  { code: "MH", name: "Marshall Islands", regionCode: "WPRO" },
  { code: "FM", name: "Micronesia (Federated States of)", regionCode: "WPRO" },
  { code: "MN", name: "Mongolia", regionCode: "WPRO" },
  { code: "NR", name: "Naoero", regionCode: "WPRO" }, // Nauru — WHO's own current short name
  { code: "NZ", name: "New Zealand", regionCode: "WPRO" },
  { code: "NU", name: "Niue", regionCode: "WPRO" },
  { code: "PW", name: "Palau", regionCode: "WPRO" },
  { code: "PG", name: "Papua New Guinea", regionCode: "WPRO" },
  { code: "PH", name: "Philippines", regionCode: "WPRO" },
  { code: "WS", name: "Samoa", regionCode: "WPRO" },
  { code: "SG", name: "Singapore", regionCode: "WPRO" },
  { code: "SB", name: "Solomon Islands", regionCode: "WPRO" },
  { code: "KR", name: "Republic of Korea", regionCode: "WPRO" },
  { code: "TO", name: "Tonga", regionCode: "WPRO" },
  { code: "TV", name: "Tuvalu", regionCode: "WPRO" },
  { code: "VU", name: "Vanuatu", regionCode: "WPRO" },
  { code: "VN", name: "Viet Nam", regionCode: "WPRO" },
];
