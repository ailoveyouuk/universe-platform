/**
 * Where each figure in Insights comes from (2026-10-25). One list, used for the small "Source" line under each chart and table and for the full
 * list on the Methodology page, so the two never disagree. Calculation details mirror packages/db/src/logistics-metrics.ts (methodology 2026.10-v1).
 */
export interface SourceDef { title: string; short: string; full: string }

export const SOURCES = {
  cost: {
    title: "Product cost prices and cost movement",
    short: "Cost prices recorded on projects by sharing organisations, before margin; movement is a like-for-like index.",
    full: "Cost prices are what a supplier or manufacturer charged, recorded on project lines by organisations that share data. They are grouped by month and by world region. Cost movement compares the same product, specification and origin month to month (a like-for-like index, starting at 100), so a change in what was bought is not mistaken for a change in price. Prices are never converted between currencies.",
  },
  freight: {
    title: "Freight cost",
    short: "Freight cost recorded on projects by sharing organisations (forwarder's charge, before margin); distances estimated.",
    full: "Freight cost is what the forwarder charged, recorded on projects by organisations that share data, by transport mode and by the region the goods left and reached. Cost per tonne-kilometre divides it by the estimated distance and the weight carried. Rates are never converted between currencies.",
  },
  freightMovement: {
    title: "Freight cost movement",
    short: "Freight cost per tonne-km by mode, month by month, indexed to 100; sharing organisations only.",
    full: "Freight cost movement is an index of freight cost per tonne-kilometre for each transport mode, month by month, starting at 100, from the freight cost recorded by organisations that share data.",
  },
  services: {
    title: "Service costs",
    short: "Service fees recorded on projects by sharing organisations, before margin, in each service's own unit.",
    full: "Service costs are what a service provider charged, recorded on project lines by organisations that share data. Each type of service is priced in its own unit (a day, a month, a fee). The categories of service are Universe's own list, built from published categories of procurement and advisory services. Costs are never converted between currencies.",
  },
  sourcing: {
    title: "Sourcing",
    short: "Manufacturer approvals by sharing organisations, by country of manufacture.",
    full: "Sourcing counts the manufacturer approvals recorded by organisations that share data, by country of manufacture and product group. Product groups are Universe's own commodity groups.",
  },
  logistics: {
    title: "Shipments, distance, time and CO2",
    short: "Shipments on sharing organisations' projects; CO2e uses GLEC Framework v3.2 factors (ISO 14083-aligned); distance is estimated.",
    full: "Shipments come from projects of organisations that share data. Distance is the great-circle (straight-line) distance between the centre points of the manufacturing and delivery countries, multiplied by a circuity factor to approximate real routes (air 1.1, sea 1.25, land 1.35); it is an estimate, not a route. CO2e is distance multiplied by weight in tonnes and a default emission factor per tonne-kilometre from the GLEC Framework v3.2, which is aligned with ISO 14083 (air 0.8, sea 0.012, land 0.09 kg CO2e). Where weight was not entered, a typical weight for the product group is used and flagged as an estimate. Days in transit are as recorded or estimated on the project.",
  },
  efficiency: {
    title: "Efficiency score",
    short: "Efficiency score: Universe's own 1 to 10 measure, mainly the CO2 intensity of the mode used.",
    full: "The efficiency score is Universe's own measure, from 1 to 10. It is driven mainly by the CO2 intensity of the transport mode used (air is far more carbon-intensive per tonne-kilometre than sea), spread across the range on a log scale, with a small adjustment for unusually short or long distances. There is no external standard for this score.",
  },
  regions: {
    title: "Regions and countries",
    short: "Regions: WHO regions; countries: ISO 3166.",
    full: "World regions follow the six WHO regions. Countries are identified by their ISO 3166 codes. Currencies are identified by their ISO 4217 codes.",
  },
  activity: {
    title: "Daily activity",
    short: "Counts of actions recorded in Universe each day by sharing organisations; counts only, never content.",
    full: "Daily activity counts how many times each kind of action was recorded in Universe that day by organisations that share data: projects started, project lines added, supplier quote requests, product batches recorded, tenders published and bids submitted. Only counts are kept, never what was in them, and a figure appears only when at least five organisations contributed. The change shown compares the latest day with the average of the seven days before it.",
  },
} satisfies Record<string, SourceDef>;
export type SourceKey = keyof typeof SOURCES;
