/** The usual chance of winning by stage, shown on the Methodology page. Keep equal to STAGE_PRIOR in apps/api/src/crm/crm-win-probability.ts (a test checks it). */
export const STAGE_PRIOR = { IDENTIFIED: 0.1, QUALIFYING: 0.25, ENGAGED: 0.5, SUBMITTED: 0.7 } as const;
