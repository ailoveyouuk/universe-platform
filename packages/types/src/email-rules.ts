/** Configurable email (2026-11-01). An organisation decides who receives an email for each type of event: registered users, and/or typed addresses. */
export interface EmailEventType { key: string; label: string; description: string; kinds: string[] }

export const EMAIL_EVENT_TYPES: EmailEventType[] = [
  { key: "tender-award", label: "Tender award approval", description: "An award decision is requested or approved.", kinds: ["TENDER_AWARD_APPROVAL"] },
  { key: "tender-debriefs", label: "Tender debriefs released", description: "Debriefs go out to bidders.", kinds: ["DEBRIEFS_RELEASED"] },
  { key: "tender-changes", label: "Tender deadline or cancellation", description: "A deadline is extended or a tender is cancelled.", kinds: ["TENDER_DEADLINE_EXTENDED", "TENDER_CANCELLED", "TIMETABLE_CHANGED"] },
  { key: "tender-evaluation", label: "Tender evaluation", description: "Evaluators are assigned or scoring is finalised.", kinds: ["TENDER_EVALUATOR_ASSIGNED", "EVALUATORS_ASSIGNED", "MINI_PANEL_ASSIGNED", "SCORING_FINALISED"] },
  { key: "complaint-logged", label: "Quality complaint logged", description: "A complaint is logged, including serious ones.", kinds: ["COMPLAINT_LOGGED", "COMPLAINT_SERIOUS", "COMPLAINT_ASSIGNED"] },
  { key: "complaint-response", label: "Quality complaint response", description: "A complaint is answered or an action is due.", kinds: ["COMPLAINT_RESPONDED", "COMPLAINT_ACTION"] },
  { key: "product-approval", label: "Product approval", description: "A product or amendment needs approval.", kinds: ["PRODUCT_APPROVAL", "PRODUCT_AMENDMENT", "AMENDMENT_DECISION"] },
  { key: "safety", label: "Safety notice or temperature excursion", description: "A safety notice or a temperature excursion is recorded.", kinds: ["SAFETY_NOTICE", "TEMPERATURE_EXCURSION"] },
  { key: "certification", label: "Partner and stakeholder approval", description: "A partner or stakeholder needs approval.", kinds: ["PARTNER_APPROVAL", "STAKEHOLDER_APPROVAL"] },
  { key: "crm-review", label: "CRM follow-ups and hospitality approval", description: "A follow-up is due or a gift or hospitality entry needs approval.", kinds: ["CRM_FOLLOW_UP", "CRM_HOSPITALITY_APPROVAL", "CRM_HOSPITALITY_DECISION"] },
  { key: "data-export", label: "Data export requests", description: "A data export is requested or decided.", kinds: ["DATA_EXPORT_REQUEST", "DATA_EXPORT_DECISION"] },
];

export interface EmailRecipientRow { id: string; eventKey: string; userId: string | null; userName: string | null; userJobTitle: string | null; address: string | null; resolvedAddress: string | null }
export interface EmailRulesView { configured: boolean; events: (EmailEventType & { recipients: EmailRecipientRow[] })[]; queued: number; failed: number }
export interface EmailPersonMatch { id: string; name: string; jobTitle: string | null; roles: string[]; email: string }
export interface EmailRecipientInput { eventKey: string; userId?: string; address?: string }
