import { SERVICE_CATEGORIES, type ServicePricingBasis } from "./service-categories";

/**
 * Standard services catalogue (2026-10-25, Lewis): the services counterpart of the product catalogue. A reference list of the services bought
 * again and again, each with the pricing basis it is normally quoted on, so a project line or a tender line can start from a named standard
 * service instead of free text, and suppliers quote the same thing in the same unit. It is shared reference data kept in code (like the service
 * categories it hangs from), versioned with the platform; a line stores the `code`, and a line may also be free text or a different basis.
 * There are no prices here: the catalogue names the service and the way it is priced, never what it costs.
 */
export interface ServiceCatalogueItem {
  /** Stable key stored on lines. Never reused or renamed. */
  code: string;
  /** SERVICE_CATEGORIES code. */
  category: string;
  name: string;
  /** The default pricing basis; the category's other usual bases remain selectable. */
  basis: ServicePricingBasis;
  /** What one unit of the basis is for this service (a visit, a sample, a pallet per month), shown beside the quantity. */
  unit: string;
  description: string;
}

const s = (code: string, category: string, name: string, basis: ServicePricingBasis, unit: string, description: string): ServiceCatalogueItem => ({ code, category, name, basis, unit, description });

export const SERVICE_CATALOGUE: ServiceCatalogueItem[] = [
  s("SVC-TA-ADVISER", "TECHNICAL_ASSISTANCE", "Embedded technical adviser", "PER_DAY", "adviser day", "An expert placed inside a ministry, medical store or programme to advise and coach day to day."),
  s("SVC-TA-CAPACITY", "TECHNICAL_ASSISTANCE", "Capacity building programme", "LUMP_SUM", "programme", "A defined programme of mentoring, tools and workshops that strengthens a named organisation."),
  s("SVC-TA-REGULATORY", "TECHNICAL_ASSISTANCE", "Regulatory systems strengthening support", "PER_DAY", "expert day", "Support to a regulator on registration, inspection or pharmacovigilance procedures."),
  s("SVC-ADV-POLICY", "ADVISORY", "Policy or regulatory review", "LUMP_SUM", "review", "A written review of a policy, law or regulation with options and recommendations."),
  s("SVC-ADV-FINANCING", "ADVISORY", "Health financing and costing advice", "PER_DAY", "expert day", "Costing, budgeting and financing options for a health programme or commodity line."),
  s("SVC-ADV-ORG", "ADVISORY", "Organisation and process design", "LUMP_SUM", "assignment", "Design of roles, structures and processes for a procurement or supply organisation."),
  s("SVC-SCA-QUANT", "SUPPLY_CHAIN_ADVISORY", "Forecasting and quantification exercise", "LUMP_SUM", "exercise", "Forecasting demand and quantifying needs for a product list over a stated period."),
  s("SVC-SCA-NETWORK", "SUPPLY_CHAIN_ADVISORY", "Supply chain network design", "LUMP_SUM", "study", "Modelling warehouse and distribution networks and recommending a design."),
  s("SVC-SCA-TENDER", "SUPPLY_CHAIN_ADVISORY", "Tender specification and evaluation support", "PER_DAY", "expert day", "Help with specifications, bid documents, evaluation and award for a tender."),
  s("SVC-SCA-MARKET", "SUPPLY_CHAIN_ADVISORY", "Market shaping and supplier engagement", "PER_DAY", "expert day", "Market analysis and supplier engagement to widen supply or improve terms."),
  s("SVC-STU-MARKET", "STUDIES_EVALUATION", "Market assessment", "LUMP_SUM", "study", "A study of supply, demand, prices and suppliers for a product or service."),
  s("SVC-STU-EVAL", "STUDIES_EVALUATION", "Programme evaluation", "LUMP_SUM", "evaluation", "A mid-term or end-of-programme evaluation with a written report."),
  s("SVC-STU-SURVEY", "STUDIES_EVALUATION", "Facility or household survey", "LUMP_SUM", "survey", "Field data collection at facilities or households, quoted as a fixed fee for the survey."),
  s("SVC-PM-PMU", "PROGRAMME_MANAGEMENT", "Programme management unit", "PER_MONTH", "month", "A standing team that runs a programme or project on behalf of a funder or government."),
  s("SVC-PM-COORD", "PROGRAMME_MANAGEMENT", "Project coordinator", "PER_MONTH", "month", "A single coordinator for a project, billed monthly."),
  s("SVC-PM-GRANT", "PROGRAMME_MANAGEMENT", "Grant management support", "PER_MONTH", "month", "Grant administration, reporting and compliance support."),
  s("SVC-TRN-COURSE", "TRAINING", "Classroom or field training course", "PER_DAY", "course day", "Delivery of a training course for health workers, storekeepers or managers."),
  s("SVC-TRN-PER-TRAINEE", "TRAINING", "Training priced per trainee", "PER_UNIT", "trainee", "A course priced per person trained."),
  s("SVC-TRN-ELEARN", "TRAINING", "E-learning development", "LUMP_SUM", "course", "Design and build of an online course or module."),
  s("SVC-TST-PSI", "TESTING_INSPECTION", "Pre-shipment inspection", "PER_UNIT", "inspection", "Physical and documentary inspection of a consignment before it ships."),
  s("SVC-TST-QC", "TESTING_INSPECTION", "Laboratory quality control testing", "PER_UNIT", "sample tested", "Testing of a sample against its specification, per sample."),
  s("SVC-TST-PMS", "TESTING_INSPECTION", "Post-market surveillance sampling", "LUMP_SUM", "sampling round", "Sampling and testing products already in the supply chain."),
  s("SVC-QA-GMP", "QUALITY_AUDIT", "Manufacturer GMP audit", "PER_DAY", "auditor day", "An audit of a manufacturer against good manufacturing practice."),
  s("SVC-QA-GDP", "QUALITY_AUDIT", "Warehouse good distribution practice audit", "PER_UNIT", "site audited", "An audit of a storage or distribution site against good distribution practice."),
  s("SVC-QA-SUPPLIER", "QUALITY_AUDIT", "Supplier qualification audit", "PER_UNIT", "supplier audited", "Assessment of a supplier before they are approved."),
  s("SVC-EQI-INSTALL", "EQUIPMENT_INSTALLATION", "Equipment installation and commissioning", "PER_UNIT", "item installed", "Installation, testing and handover of equipment at a facility."),
  s("SVC-EQI-TRAIN", "EQUIPMENT_INSTALLATION", "User training on new equipment", "PER_DAY", "training day", "Training the staff who will use or look after new equipment."),
  s("SVC-EQI-SOLAR", "EQUIPMENT_INSTALLATION", "Solar cold chain installation", "PER_UNIT", "system installed", "Installing solar direct-drive refrigerators or freezers, including site preparation."),
  s("SVC-EQM-PPM", "EQUIPMENT_MAINTENANCE", "Planned preventive maintenance", "PER_UNIT", "visit", "A scheduled maintenance visit to inspect and service equipment."),
  s("SVC-EQM-CONTRACT", "EQUIPMENT_MAINTENANCE", "Annual maintenance contract", "PER_MONTH", "month", "A recurring contract covering preventive and corrective maintenance for a defined equipment list."),
  s("SVC-EQM-REPAIR", "EQUIPMENT_MAINTENANCE", "Corrective repair", "PER_UNIT", "repair call-out", "A repair visit after a fault, labour priced per call-out."),
  s("SVC-EQM-CALIBRATION", "EQUIPMENT_MAINTENANCE", "Calibration", "PER_UNIT", "instrument calibrated", "Calibration of laboratory or clinical instruments with a certificate."),
  s("SVC-PA-FEE", "PROCUREMENT_AGENT", "Procurement agent fee", "PERCENT_OF_GOODS", "% of goods value", "A fee, as a percentage of the value of goods bought, for buying on behalf of another organisation."),
  s("SVC-PA-POOLED", "PROCUREMENT_AGENT", "Pooled procurement service", "PERCENT_OF_GOODS", "% of goods value", "Combining the orders of several buyers into one purchase."),
  s("SVC-PA-SUPPLIERMGMT", "PROCUREMENT_AGENT", "Supplier and contract management", "LUMP_SUM", "annual fee", "Managing supplier performance, orders and contracts for a buyer."),
  s("SVC-WH-PALLET", "WAREHOUSING", "Ambient pallet storage", "PER_UNIT", "pallet per month", "Storing goods at ambient temperature, priced per pallet position per month."),
  s("SVC-WH-COLD", "WAREHOUSING", "Cold room storage (2 to 8 °C)", "PER_UNIT", "pallet per month", "Temperature-controlled storage between 2 and 8 °C, priced per pallet position per month."),
  s("SVC-WH-DIST", "WAREHOUSING", "Distribution management", "PERCENT_OF_GOODS", "% of goods value", "Receiving, picking and dispatching goods to facilities, as a share of the goods handled."),
  s("SVC-CUS-CLEAR", "CUSTOMS_HANDLING", "Customs clearance", "PER_UNIT", "shipment", "Clearing a shipment through customs, per shipment."),
  s("SVC-CUS-PERMIT", "CUSTOMS_HANDLING", "Import permit and waiver processing", "PER_UNIT", "application", "Preparing and following up import permits and duty waivers."),
  s("SVC-CUS-PORT", "CUSTOMS_HANDLING", "Port handling and demurrage management", "LUMP_SUM", "shipment", "Port handling and avoiding demurrage on a consignment."),
  s("SVC-PK-KIT", "PACKING_KITTING", "Kit assembly", "PER_UNIT", "kit", "Assembling items into kits ready for dispatch."),
  s("SVC-PK-RELABEL", "PACKING_KITTING", "Relabelling and repacking", "PER_UNIT", "unit", "Relabelling or repacking goods for a destination country."),
  s("SVC-CCH-MONITOR", "COLD_CHAIN_SERVICES", "Temperature monitoring", "PER_UNIT", "device", "Temperature loggers or remote monitoring devices with data reporting."),
  s("SVC-CCH-VALIDATE", "COLD_CHAIN_SERVICES", "Cold chain validation and mapping", "PER_UNIT", "site validated", "Temperature mapping and validation of a store, vehicle or packaging."),
  s("SVC-CCH-MONSUB", "COLD_CHAIN_SERVICES", "Remote temperature monitoring subscription", "PER_MONTH", "device per month", "A recurring subscription for remote temperature monitoring and alerts."),
  s("SVC-IT-SOFTWARE", "IT_DATA", "Software licence and hosting", "PER_MONTH", "month", "A recurring licence and hosting fee for logistics, stock or data software."),
  s("SVC-IT-SUPPORT", "IT_DATA", "IT support", "PER_MONTH", "month", "Help desk and technical support for information systems."),
  s("SVC-IT-DEV", "IT_DATA", "System configuration or development", "PER_DAY", "developer day", "Configuring or building software features."),
  s("SVC-IT-DATA", "IT_DATA", "Data analysis and dashboard build", "LUMP_SUM", "assignment", "Cleaning, analysing and presenting data in dashboards."),
  s("SVC-FIN-AUDIT", "FINANCIAL_PROFESSIONAL", "Financial audit", "LUMP_SUM", "audit", "An external audit of accounts or a grant."),
  s("SVC-FIN-INSURANCE", "FINANCIAL_PROFESSIONAL", "Cargo or product liability insurance", "PERCENT_OF_GOODS", "% of goods value", "Insurance premium as a percentage of the goods insured."),
  s("SVC-FIN-LEGAL", "FINANCIAL_PROFESSIONAL", "Legal services", "PER_DAY", "lawyer day", "Legal advice on contracts and regulation."),
  s("SVC-FLD-OUTREACH", "FIELD_HEALTH_SERVICES", "Outreach and community delivery", "PER_UNIT", "outreach visit", "Taking health services or commodities to communities, priced per visit."),
  s("SVC-FLD-STAFF", "FIELD_HEALTH_SERVICES", "Field staff", "PER_DAY", "staff day", "Field health or logistics staff supplied by day."),
  s("SVC-FLD-LASTMILE", "FIELD_HEALTH_SERVICES", "Last-mile delivery to facilities", "PER_UNIT", "facility delivery", "Delivering commodities from a district store to health facilities."),
  s("SVC-WST-DISPOSAL", "WASTE_MANAGEMENT", "Healthcare waste collection and disposal", "PER_UNIT", "kg or collection", "Collecting and treating healthcare waste."),
  s("SVC-WST-DESTROY", "WASTE_MANAGEMENT", "Destruction of expired or quarantined stock", "LUMP_SUM", "destruction event", "Witnessed destruction of expired or rejected products with a certificate."),
  s("SVC-FAC-CLEAN", "FACILITIES", "Cleaning and facilities maintenance", "PER_MONTH", "month", "Cleaning and routine upkeep of a facility."),
  s("SVC-FAC-SECURITY", "FACILITIES", "Security services", "PER_MONTH", "month", "Guarding of a store or facility."),
  s("SVC-COM-DESIGN", "COMMUNICATIONS", "Graphic design", "PER_DAY", "designer day", "Design of materials, reports or visual identity."),
  s("SVC-COM-PRINT", "COMMUNICATIONS", "Printing", "PER_UNIT", "copy", "Printing guidelines, forms or training materials."),
  s("SVC-COM-CAMPAIGN", "COMMUNICATIONS", "Communications campaign", "LUMP_SUM", "campaign", "A planned communications or demand-creation campaign."),
  s("SVC-ADM-TRANSLATE", "ADMIN_SUPPORT", "Translation", "PER_UNIT", "word or page", "Translation of documents between languages."),
  s("SVC-ADM-EVENT", "ADMIN_SUPPORT", "Event or workshop organisation", "LUMP_SUM", "event", "Venue, travel and logistics for a meeting or workshop."),
  s("SVC-ADM-SUPPORT", "ADMIN_SUPPORT", "Administrative support", "PER_DAY", "staff day", "Administrative or secretarial support."),
];

export const serviceCatalogueByCode = (code: string | null | undefined) => SERVICE_CATALOGUE.find((i) => i.code === code) ?? null;
export const SERVICE_CATALOGUE_CODES = SERVICE_CATALOGUE.map((i) => i.code);
/** Every catalogue item must point at a real category and sit on one of that category's usual bases (checked by a test). */
export const serviceCatalogueProblems = (): string[] => {
  const out: string[] = []; const seen = new Set<string>();
  for (const i of SERVICE_CATALOGUE) {
    if (seen.has(i.code)) out.push(`${i.code} is repeated`); seen.add(i.code);
    const c = SERVICE_CATEGORIES.find((x) => x.code === i.category);
    if (!c) out.push(`${i.code} has an unknown category`); else if (!c.bases.includes(i.basis)) out.push(`${i.code} uses a basis its category does not`);
  }
  for (const c of SERVICE_CATEGORIES) if (!SERVICE_CATALOGUE.some((i) => i.category === c.code)) out.push(`${c.code} has no catalogue item`);
  return out;
};

/** A catalogue row as the API returns it; `active` is false once platform staff switch the service off. */
export interface ServiceCatalogueRow extends ServiceCatalogueItem { active: boolean }
