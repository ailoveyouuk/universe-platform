import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { CRM_OPEN_STAGES, type CrmGapScope, type DataGap } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";

/**
 * Where the CRM's figures are being fed less than they could be, and how to fix it (shared pattern, see DataGap). Counts only: the organisation's own records,
 * no money, nothing from other organisations. Each gap links to the list (or field) that fixes it, and disappears once nothing is missing.
 */
@Injectable()
export class CrmGapsService {
  async gaps(user: RequestUser, scope: CrmGapScope): Promise<DataGap[]> {
    assertHasPermission(user, "crm.view");
    const org = user.organizationId;
    return withTenantContext(org, async (tx) => {
      const out: DataGap[] = [];
      const push = (g: Omit<DataGap, "fixLabel"> & { fixLabel?: string | null }) => { if (g.count > 0) out.push({ fixLabel: "Show them", ...g } as DataGap); };
      if (scope === "pipeline" || scope === "overview") {
        const open = { organizationId: org, archivedAt: null, stage: { in: [...CRM_OPEN_STAGES] } };
        const [total, noValue, noDate, noGroup, noOwner, noLink, closed] = await Promise.all([
          tx.crmOpportunity.count({ where: open }),
          tx.crmOpportunity.count({ where: { ...open, expectedValue: null } }),
          tx.crmOpportunity.count({ where: { ...open, expectedDate: null } }),
          tx.crmOpportunity.count({ where: { ...open, commodityGroup: null } }),
          tx.crmOpportunity.count({ where: { ...open, ownerUserId: null } }),
          tx.crmOpportunity.count({ where: { ...open, sourceTenderId: null, linkedId: null } }),
          tx.crmOpportunity.count({ where: { organizationId: org, archivedAt: null, stage: { in: ["WON", "LOST"] } } }),
        ]);
        const l = (g: string) => `/pipeline?gap=${g}`;
        push({ key: "noValue", label: "Open opportunities with no expected value", benefit: "They count in the stage tiles but add nothing to the pipeline value, likely-to-land total or currency exposure.", count: noValue, total, href: l("noValue") });
        push({ key: "noDate", label: "Open opportunities with no expected date", benefit: "They cannot be placed in a month, so the forecast by month and the 'past its date' reminders miss them.", count: noDate, total, href: l("noDate") });
        push({ key: "noGroup", label: "Open opportunities with no commodity or service group", benefit: "The chance of winning cannot learn from like-for-like past work, so it leans on the stage alone.", count: noGroup, total, href: l("noGroup") });
        push({ key: "noOwner", label: "Open opportunities with no owner", benefit: "Nobody is reminded when they go stale, and the owner view cannot show who is carrying them.", count: noOwner, total, href: l("noOwner") });
        push({ key: "noLink", label: "Open opportunities not linked to a tender or project", benefit: "People involved are not worked out for you and the stage cannot follow the bid or project.", count: noLink, total, href: l("noLink") });
        if (closed < 10) push({ key: "fewClosed", label: `Only ${closed} closed opportunit${closed === 1 ? "y" : "ies"} so far`, benefit: "Chances of winning stay close to the usual stage figures until about ten have closed. Record wins and losses as they happen.", count: 1, total: 1, href: "/pipeline", fixLabel: "Open the pipeline" });
      }
      if (scope === "portfolio" || scope === "overview") {
        const live = { organizationId: org, archivedAt: null };
        const [total, noOwner, noSummary, noCountry, noReview] = await Promise.all([
          tx.crmRelationship.count({ where: live }),
          tx.crmRelationship.count({ where: { ...live, ownerUserId: null, status: { not: "ENDED" } } }),
          tx.crmRelationship.count({ where: { ...live, summary: null, status: { not: "ENDED" } } }),
          tx.crmRelationship.count({ where: { ...live, partner: { countryCode: null } } }),
          tx.crmRelationship.count({ where: { ...live, nextReviewDue: null, status: { not: "ENDED" } } }),
        ]);
        const l = (g: string) => `/relationships?gap=${g}`;
        push({ key: "rNoCountry", label: "Stakeholders with no country", benefit: "They are missing from the Portfolio map and from country filters.", count: noCountry, total, href: l("noCountry") });
        push({ key: "rNoOwner", label: "Stakeholders with no owner", benefit: "Review and quiet-relationship reminders have nobody to go to.", count: noOwner, total, href: l("noOwner") });
        push({ key: "rNoReview", label: "Stakeholders with no review date", benefit: "They never appear under reviews due, so health cannot warn when a review is overdue.", count: noReview, total, href: l("noReview") });
        push({ key: "rNoSummary", label: "Stakeholders with no summary", benefit: "Colleagues cannot see at a glance what the relationship is for.", count: noSummary, total, href: l("noSummary") });
      }
      return out;
    });
  }
}
