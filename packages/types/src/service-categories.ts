/**
 * Services (2026-10-25, Lewis): a category of its own, separate from goods and from freight. A service is bought by time, by output or by fee,
 * not by weight, so it has its own taxonomy and its own way of stating a cost (the "pricing basis"). Freight (moving goods) is priced on the
 * project as freight cost and is NOT a service here; customs, storage and handling are services around the goods and sit under supply chain
 * operations.
 *
 * Evidence (details and links in docs/SERVICES-CATEGORY-RESEARCH.md): World Bank procurement regulations split services into consulting
 * (advice, studies, management, training) and non-consulting (output-based, e.g. drilling, mapping), and treat installation, commissioning,
 * training and initial maintenance as services related to goods; UNICEF country offices procure transport and logistics, consultancy,
 * financial audit and assessment, editorial and printing, administrative support, equipment maintenance and IT support; the Global Fund pooled
 * procurement uses procurement service agents and quality assurance; WHO's equipment maintenance guidance covers inspection, preventive and
 * corrective maintenance; UNFPA reports freight, storage and customs and management and evaluation services as distinct spend lines.
 * UNSPSC service segments (management and business professional services; engineering, research and technology services; education and
 * training; healthcare; transportation, storage and mail; environmental; financial and insurance; and others) were used to check nothing
 * large was missed. Codes are approximate and not mapped to UNSPSC (its use needs a licence check first).
 */
export type ServicePricingBasis = "PER_DAY" | "PER_HOUR" | "PER_MONTH" | "PER_UNIT" | "LUMP_SUM" | "PERCENT_OF_GOODS";

export const SERVICE_PRICING_BASES: { code: ServicePricingBasis; label: string; quantityLabel: string }[] = [
  { code: "PER_DAY", label: "Per person-day", quantityLabel: "Number of days" },
  { code: "PER_HOUR", label: "Per hour", quantityLabel: "Number of hours" },
  { code: "PER_MONTH", label: "Per month (retainer or recurring)", quantityLabel: "Number of months" },
  { code: "PER_UNIT", label: "Per unit of output (sample, visit, pallet, device)", quantityLabel: "Number of units" },
  { code: "LUMP_SUM", label: "Fixed fee", quantityLabel: "Number of fixed fees" },
  { code: "PERCENT_OF_GOODS", label: "Percentage of the value of goods handled", quantityLabel: "Value of goods handled" },
];
export const servicePricingBasisLabel = (code: string | null | undefined) => SERVICE_PRICING_BASES.find((b) => b.code === code)?.label ?? code ?? "";

/** World Bank procurement type, kept so a service can be placed against a funder's own classification. */
export type ServiceProcurementType = "CONSULTING" | "NON_CONSULTING" | "GOODS_RELATED";

export interface ServiceCategory {
  code: string;
  label: string;
  /** Short heading the sub-categories are grouped under. */
  group: string;
  description: string;
  procurementType: ServiceProcurementType;
  /** The usual pricing bases, first is the default. */
  bases: ServicePricingBasis[];
  examples: string[];
}

export const SERVICE_GROUPS = [
  "Consultancy and advisory",
  "Quality, testing and assurance",
  "Equipment services",
  "Supply chain operations (not freight)",
  "Digital and data",
  "Financial and professional",
  "Health and field services",
  "Environment and facilities",
  "Communications and support",
] as const;

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { code: "TECHNICAL_ASSISTANCE", group: "Consultancy and advisory", label: "Technical assistance and capacity building", procurementType: "CONSULTING", bases: ["PER_DAY", "LUMP_SUM"], description: "Hands-on expert support that builds a government's or organisation's own ability: embedded advisers, mentoring, system strengthening.", examples: ["Embedded supply chain adviser", "Capacity building programme for a national medical store", "Regulatory strengthening support"] },
  { code: "ADVISORY", group: "Consultancy and advisory", label: "Policy, regulatory and management advisory", procurementType: "CONSULTING", bases: ["PER_DAY", "LUMP_SUM"], description: "Expert advice on policy, strategy, regulation, organisation and financing, delivered as reports, options or recommendations.", examples: ["Health financing options paper", "Medicines policy review", "Organisation design"] },
  { code: "SUPPLY_CHAIN_ADVISORY", group: "Consultancy and advisory", label: "Supply chain and procurement advisory", procurementType: "CONSULTING", bases: ["PER_DAY", "LUMP_SUM"], description: "Forecasting and quantification, supply chain network design, procurement strategy, tender support and market shaping.", examples: ["National quantification exercise", "Distribution network design", "Tender specification and evaluation support"] },
  { code: "STUDIES_EVALUATION", group: "Consultancy and advisory", label: "Studies, evaluation and research", procurementType: "CONSULTING", bases: ["LUMP_SUM", "PER_DAY"], description: "Feasibility and market studies, surveys, monitoring and evaluation, operational research.", examples: ["End-of-programme evaluation", "Market assessment", "Facility survey"] },
  { code: "PROGRAMME_MANAGEMENT", group: "Consultancy and advisory", label: "Programme and project management", procurementType: "CONSULTING", bases: ["PER_MONTH", "PER_DAY", "LUMP_SUM"], description: "Running or coordinating a programme or project on behalf of a funder or government.", examples: ["Programme management unit", "Project coordination", "Grant management support"] },
  { code: "TRAINING", group: "Consultancy and advisory", label: "Training and education", procurementType: "CONSULTING", bases: ["PER_DAY", "PER_UNIT", "LUMP_SUM"], description: "Designing and delivering courses and workshops for health workers, managers and technicians.", examples: ["Pharmacy storekeeper training", "Biomedical technician course", "E-learning development"] },
  { code: "TESTING_INSPECTION", group: "Quality, testing and assurance", label: "Sampling, inspection and laboratory testing", procurementType: "NON_CONSULTING", bases: ["PER_UNIT", "LUMP_SUM"], description: "Sampling products and testing them against specification: pre-shipment inspection, post-market quality control, laboratory analysis.", examples: ["Pre-shipment inspection", "Quality control laboratory testing", "Post-market surveillance sampling"] },
  { code: "QUALITY_AUDIT", group: "Quality, testing and assurance", label: "Quality and compliance audits", procurementType: "CONSULTING", bases: ["PER_DAY", "LUMP_SUM", "PER_UNIT"], description: "Inspections and audits of manufacturers, warehouses and facilities against good manufacturing, distribution and storage practice, and regulatory submission support.", examples: ["GMP inspection support", "Good distribution practice audit", "Supplier qualification audit"] },
  { code: "EQUIPMENT_INSTALLATION", group: "Equipment services", label: "Installation, commissioning and user training", procurementType: "GOODS_RELATED", bases: ["PER_UNIT", "LUMP_SUM", "PER_DAY"], description: "Putting equipment into service and training its users, usually bought with the equipment.", examples: ["Solar fridge installation", "X-ray commissioning", "Oxygen plant handover training"] },
  { code: "EQUIPMENT_MAINTENANCE", group: "Equipment services", label: "Maintenance, calibration and repair", procurementType: "NON_CONSULTING", bases: ["PER_UNIT", "PER_MONTH", "LUMP_SUM"], description: "Performance and safety inspections, planned preventive maintenance, calibration and corrective repair of medical and laboratory equipment.", examples: ["Annual preventive maintenance contract", "Cold chain equipment repair", "Analyser calibration"] },
  { code: "PROCUREMENT_AGENT", group: "Supply chain operations (not freight)", label: "Procurement and agent services", procurementType: "NON_CONSULTING", bases: ["PERCENT_OF_GOODS", "LUMP_SUM"], description: "Buying on behalf of another organisation for a fee, including pooled procurement and procurement service agents.", examples: ["Procurement agent fee", "Pooled procurement service", "Supplier management fee"] },
  { code: "WAREHOUSING", group: "Supply chain operations (not freight)", label: "Warehousing, storage and distribution management", procurementType: "NON_CONSULTING", bases: ["PER_UNIT", "PER_MONTH", "PERCENT_OF_GOODS"], description: "Storing goods and managing their onward distribution, including temperature-controlled storage. Moving the goods between countries is freight, priced separately.", examples: ["Pallet storage per month", "Last-mile distribution management", "Cold room storage"] },
  { code: "CUSTOMS_HANDLING", group: "Supply chain operations (not freight)", label: "Customs clearance and import support", procurementType: "NON_CONSULTING", bases: ["PER_UNIT", "LUMP_SUM", "PERCENT_OF_GOODS"], description: "Clearing goods through customs, import permits and duty or waiver paperwork, port handling.", examples: ["Customs clearing per shipment", "Import permit handling", "Duty waiver processing"] },
  { code: "PACKING_KITTING", group: "Supply chain operations (not freight)", label: "Packing, labelling and kitting", procurementType: "NON_CONSULTING", bases: ["PER_UNIT", "LUMP_SUM"], description: "Repacking, labelling, assembling kits and preparing goods for shipment.", examples: ["Kit assembly", "Relabelling", "Palletising and wrapping"] },
  { code: "COLD_CHAIN_SERVICES", group: "Supply chain operations (not freight)", label: "Cold chain monitoring and validation", procurementType: "NON_CONSULTING", bases: ["PER_UNIT", "PER_MONTH", "LUMP_SUM"], description: "Temperature monitoring, mapping and qualification of stores and vehicles, data loggers and alarm services.", examples: ["Cold store temperature mapping", "Data logger service", "Vehicle qualification"] },
  { code: "IT_DATA", group: "Digital and data", label: "Software, IT support and data systems", procurementType: "NON_CONSULTING", bases: ["PER_MONTH", "PER_DAY", "LUMP_SUM"], description: "Logistics management information systems, software licences and support, hosting, data analysis and IT support.", examples: ["LMIS support", "Software subscription", "Data dashboard build"] },
  { code: "FINANCIAL_PROFESSIONAL", group: "Financial and professional", label: "Audit, financial assessment, insurance and legal", procurementType: "CONSULTING", bases: ["LUMP_SUM", "PER_DAY", "PERCENT_OF_GOODS"], description: "Financial audit and assessment, cargo and liability insurance services, legal and contracting support.", examples: ["Annual financial audit", "Partner capacity assessment", "Contract review"] },
  { code: "FIELD_HEALTH_SERVICES", group: "Health and field services", label: "Field delivery and community health services", procurementType: "NON_CONSULTING", bases: ["PER_UNIT", "PER_DAY", "LUMP_SUM"], description: "Delivering health services in the field: campaigns, outreach, clinical and laboratory services, medical evacuation.", examples: ["Vaccination campaign delivery", "Mobile outreach clinic", "Laboratory service contract"] },
  { code: "WASTE_MANAGEMENT", group: "Environment and facilities", label: "Healthcare waste management and destruction", procurementType: "NON_CONSULTING", bases: ["PER_UNIT", "LUMP_SUM", "PER_MONTH"], description: "Collecting, treating and disposing of healthcare waste and destroying expired or unusable products.", examples: ["Destruction of expired medicines", "Sharps waste collection", "Incinerator operation"] },
  { code: "FACILITIES", group: "Environment and facilities", label: "Facilities maintenance, cleaning and security", procurementType: "NON_CONSULTING", bases: ["PER_MONTH", "LUMP_SUM"], description: "Looking after buildings and sites: cleaning, security, grounds, minor repairs. Construction is works, not a service here.", examples: ["Warehouse cleaning", "Security guards", "Generator servicing"] },
  { code: "COMMUNICATIONS", group: "Communications and support", label: "Communications, design and printing", procurementType: "CONSULTING", bases: ["LUMP_SUM", "PER_DAY", "PER_UNIT"], description: "Behaviour-change communication, editorial and graphic design, printing and publishing.", examples: ["Health awareness campaign", "Guideline design and printing", "Video production"] },
  { code: "ADMIN_SUPPORT", group: "Communications and support", label: "Translation, events, travel and administrative support", procurementType: "NON_CONSULTING", bases: ["PER_DAY", "PER_UNIT", "LUMP_SUM"], description: "Translation and interpreting, meetings and events, travel arrangements, secretarial and other administrative support.", examples: ["Document translation", "Workshop logistics", "Administrative assistant"] },
];

export const serviceCategoryByCode = (code: string | null | undefined) => SERVICE_CATEGORIES.find((c) => c.code === code) ?? null;
export const serviceCategoryLabel = (code: string | null | undefined) => serviceCategoryByCode(code)?.label ?? code ?? "";
export const SERVICE_CATEGORY_CODES = SERVICE_CATEGORIES.map((c) => c.code);
export const SERVICE_PRICING_BASIS_CODES = SERVICE_PRICING_BASES.map((b) => b.code);
