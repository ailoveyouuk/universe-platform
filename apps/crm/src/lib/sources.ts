/**
 * Where each CRM figure comes from, in one place (2026-10-27, requested by Lewis: subtle references throughout the CRM and a consolidated methodology).
 * `short` is the one-line note shown under a chart or tile; `anchor` is the matching row on the Methodology page. Keep the two in step when a calculation changes.
 */
export const SOURCES = {
  kinds: { short: "Counts your stakeholder records by the roles held in Project Management. A stakeholder with more than one role is counted under each.", anchor: "figures" },
  overview: { short: "Counts of your own relationships and their calculated health, review dates and owners. Nothing here leaves your organisation.", anchor: "figures" },
  health: { short: "Health is calculated, not typed: approval status, certificate expiry, open quality complaints, overdue reviews and time since the last interaction.", anchor: "health" },
  portfolio: { short: "Projects with each stakeholder, counted by outcome from Project Management. Places and contacts come from Project Management and this CRM.", anchor: "figures" },
  compliance: { short: "Certificates and evidence come from the stakeholder records in Project Management. Gifts and hospitality are your own register, held against your own policy.", anchor: "figures" },
  pipeline: { short: "Your opportunities, converted into the chosen currency at the platform's daily exchange rate. Cost-side estimates only, never a price with margin.", anchor: "pipeline" },
  forecast: { short: "Likely to land = value x estimated chance of winning, from your own closed opportunities and the stage each is at.", anchor: "probability" },
  probability: { short: "Starts from a usual figure for the stage, then moves with your own history of like-for-like work and with this stakeholder. Few results count for little.", anchor: "probability" },
  attention: { short: "Open opportunities with no stage movement for 60 days or more, or past their expected date.", anchor: "pipeline" },
  owners: { short: "Each opportunity's named owner; where there is none and it is linked to a project, that project's lead.", anchor: "pipeline" },
  exposure: { short: "Open opportunities grouped by the currency they were entered in, with shares taken after conversion.", anchor: "pipeline" },
  flow: { short: "From the stage history kept each time an opportunity is created or moves. Needs a few moves to say anything.", anchor: "pipeline" },
  lost: { short: "The factors come from your own organisation's records (contact history, tenders, approvals, certificates, complaints, delivery); reasons are the ones people recorded. Withdrawn opportunities are kept apart because they say nothing about winning.", anchor: "pipeline" },
  tree: { short: "Built from your own stakeholders, the projects you can see in Project Management and your opportunities. Suggestions score shared kind, country, shared contacts and period.", anchor: "tree" },
  search: { short: "Searches your own CRM records. Every word must match somewhere, and confidential notes only appear to people allowed to see them.", anchor: "search" },
  network: { short: "Other Universe organisations appear anonymised unless they chose to share their identity, and only in groups of five or more.", anchor: "privacy" },
  export: { short: "Exports cover what your organisation entered, are audited, and follow the filters you have applied.", anchor: "privacy" },
} as const;
export type SourceKey = keyof typeof SOURCES;
