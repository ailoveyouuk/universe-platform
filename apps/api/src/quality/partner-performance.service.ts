import { Injectable } from "@nestjs/common";
import { Prisma, withTenantContext } from "@universe/db";
import type { PagedResult, PartnerPerformanceMetric } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";

const PERFORMANCE_ROLE_TYPES = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER"] as const;
type PerformanceRoleType = (typeof PERFORMANCE_ROLE_TYPES)[number];

function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal place
}

/**
 * Freight forwarder / supplier / manufacturer performance scorecards (round
 * 3 feedback, item 6) — "a metric score for meeting deadlines (GAD dates,
 * any issues flagged against a record, and all other KPI metrics to
 * benchmark performance)".
 *
 * KNOWN APPROXIMATION (flagged explicitly rather than silently assumed):
 * the schema's on-time/in-full flags (ProjectLine.internalOnTime,
 * .supplierOnTime, .supplierInFull) are recorded per line, not per role —
 * there's no separate "was the freight forwarder on time" flag distinct
 * from "was the supplier on time". Until that's split out at entry time,
 * this service uses supplierOnTime/supplierInFull for the SUPPLIER role
 * (the closest match) and internalOnTime as a general proxy for
 * MANUFACTURER and FREIGHT_FORWARDER — worth confirming with Lewis once
 * real data is flowing through, see architecture-decisions.md.
 */
@Injectable()
export class PartnerPerformanceService {
  /** Unpaged compatibility wrapper (first 500 by activity). Screens use getPerformancePage. */
  async getPerformance(user: RequestUser, roleType?: string): Promise<PartnerPerformanceMetric[]> {
    return (await this.getPerformancePage(user, { roleType, page: 1, pageSize: 500 })).items;
  }

  /**
   * One page of scorecards, aggregated in the database (2026-10-17, scale work). The previous
   * version loaded every partner and every project line into memory and filtered the whole line
   * list once per partner and role (quadratic), which is the slowest list in the scale test.
   * Now a single grouped query per role computes the counts, percentages and average days late,
   * and the page is sorted and cut in SQL.
   *
   * Behaviour change: partners with no project-line activity in a role are no longer listed with a
   * row of zeros; a scorecard only exists once there is something to score.
   * Late days are the rounded whole days between projected and actual delivery, floored at 0.
   */
  async getPerformancePage(
    user: RequestUser,
    opts: { roleType?: string; q?: string; page?: number; pageSize?: number },
  ): Promise<PagedResult<PartnerPerformanceMetric>> {
    const roleType = PERFORMANCE_ROLE_TYPES.find((r) => r === opts.roleType);
    if (opts.roleType && !roleType) return { items: [], total: 0, page: 1, pageSize: opts.pageSize ?? 25 };
    const pageSize = Math.min(Math.max(Math.floor(opts.pageSize ?? 25), 5), 500);
    const page = Math.max(Math.floor(opts.page ?? 1), 1);
    const term = opts.q?.trim();
    const org = user.organizationId;

    const late = Prisma.sql`CASE WHEN l.projectedDeliveryDate IS NOT NULL AND l.actualDeliveryDate IS NOT NULL
      THEN CASE WHEN ROUND(DATEDIFF(SECOND, l.projectedDeliveryDate, l.actualDeliveryDate) / 86400.0, 0) > 0
        THEN ROUND(DATEDIFF(SECOND, l.projectedDeliveryDate, l.actualDeliveryDate) / 86400.0, 0) ELSE 0 END END`;
    const manufacturer = Prisma.sql`SELECT l.manufacturerId AS partnerId, 'MANUFACTURER' AS roleType, COUNT(*) AS totalLines,
        COUNT(l.internalOnTime) AS onTimeFlags, SUM(CASE WHEN l.internalOnTime = 1 THEN 1 ELSE 0 END) AS onTimeCount,
        0 AS inFullFlags, 0 AS inFullCount, 0 AS otifNum, 0 AS otifDen, COUNT(${late}) AS lateN, SUM(${late}) AS lateSum
      FROM project_lines l WHERE l.organizationId = ${org} AND l.archivedAt IS NULL AND l.manufacturerId IS NOT NULL GROUP BY l.manufacturerId`;
    const supplier = Prisma.sql`SELECT l.supplierId AS partnerId, 'SUPPLIER' AS roleType, COUNT(*) AS totalLines,
        COUNT(l.supplierOnTime) AS onTimeFlags, SUM(CASE WHEN l.supplierOnTime = 1 THEN 1 ELSE 0 END) AS onTimeCount,
        COUNT(l.supplierInFull) AS inFullFlags, SUM(CASE WHEN l.supplierInFull = 1 THEN 1 ELSE 0 END) AS inFullCount,
        SUM(CASE WHEN l.supplierOnTime = 1 AND l.supplierInFull = 1 THEN 1 ELSE 0 END) AS otifNum,
        SUM(CASE WHEN l.supplierOnTime IS NOT NULL AND l.supplierInFull IS NOT NULL THEN 1 ELSE 0 END) AS otifDen,
        COUNT(${late}) AS lateN, SUM(${late}) AS lateSum
      FROM project_lines l WHERE l.organizationId = ${org} AND l.archivedAt IS NULL AND l.supplierId IS NOT NULL GROUP BY l.supplierId`;
    // Freight forwarder is recorded per project (moved off the line 2026-10-03): a forwarder's lines
    // are every line of a project it handles.
    const freight = Prisma.sql`SELECT pr.freightForwarderId AS partnerId, 'FREIGHT_FORWARDER' AS roleType, COUNT(*) AS totalLines,
        COUNT(l.internalOnTime) AS onTimeFlags, SUM(CASE WHEN l.internalOnTime = 1 THEN 1 ELSE 0 END) AS onTimeCount,
        0 AS inFullFlags, 0 AS inFullCount, 0 AS otifNum, 0 AS otifDen, COUNT(${late}) AS lateN, SUM(${late}) AS lateSum
      FROM project_lines l JOIN projects pr ON pr.id = l.projectId
      WHERE l.organizationId = ${org} AND l.archivedAt IS NULL AND pr.freightForwarderId IS NOT NULL GROUP BY pr.freightForwarderId`;
    const source =
      roleType === "MANUFACTURER"
        ? manufacturer
        : roleType === "SUPPLIER"
          ? supplier
          : roleType === "FREIGHT_FORWARDER"
            ? freight
            : Prisma.sql`${manufacturer} UNION ALL ${supplier} UNION ALL ${freight}`;
    const search = term ? Prisma.sql`AND p.name LIKE ${"%" + term + "%"}` : Prisma.empty;

    type Row = {
      partnerId: string;
      partnerName: string;
      roleType: string;
      totalLines: number;
      onTimeFlags: number;
      onTimeCount: number;
      inFullFlags: number;
      inFullCount: number;
      otifNum: number;
      otifDen: number;
      lateN: number;
      lateSum: number | null;
      issues: number;
      complaintsUpheld: number;
      complaintsTotal: number;
      total: number;
    };
    const rows = await withTenantContext(org, (tx) =>
      tx.$queryRaw<Row[]>(Prisma.sql`
        SELECT a.partnerId, p.name AS partnerName, a.roleType, a.totalLines, a.onTimeFlags, a.onTimeCount, a.inFullFlags, a.inFullCount,
               a.otifNum, a.otifDen, a.lateN, a.lateSum, ISNULL(e.issues, 0) AS issues,
               ISNULL(c.upheld, 0) AS complaintsUpheld, ISNULL(c.total, 0) AS complaintsTotal, COUNT(*) OVER() AS total
        FROM (${source}) a
        JOIN partners p ON p.id = a.partnerId AND p.organizationId = ${org} AND p.isArchived = 0
        JOIN partner_roles r ON r.partnerId = p.id AND r.roleType = a.roleType AND r.isActive = 1
        LEFT JOIN (
          SELECT supplierId, COUNT(*) AS issues FROM supplier_enquiries
          WHERE organizationId = ${org} AND responseStatus IN ('DECLINED', 'NO_RESPONSE') GROUP BY supplierId
        ) e ON e.supplierId = a.partnerId AND a.roleType = 'SUPPLIER'
        LEFT JOIN (
          SELECT partnerId, COUNT(*) AS total, SUM(CASE WHEN outcome IN ('UPHELD', 'PARTLY_UPHELD') THEN 1 ELSE 0 END) AS upheld
          FROM quality_complaints
          WHERE organizationId = ${org} AND archivedAt IS NULL AND partnerId IS NOT NULL AND status <> 'WITHDRAWN' GROUP BY partnerId
        ) c ON c.partnerId = a.partnerId
        WHERE 1 = 1 ${search}
        ORDER BY a.totalLines DESC, p.name ASC, a.partnerId ASC, a.roleType ASC
        OFFSET ${(page - 1) * pageSize} ROWS FETCH NEXT ${pageSize} ROWS ONLY`),
    );

    const num = (v: unknown) => Number(v ?? 0);
    const items: PartnerPerformanceMetric[] = rows.map((r) => {
      const supplierRole = r.roleType === "SUPPLIER";
      const onTimePercent = pct(num(r.onTimeCount), num(r.onTimeFlags));
      return {
        partnerId: r.partnerId,
        partnerName: r.partnerName,
        roleType: r.roleType,
        totalLines: num(r.totalLines),
        onTimeCount: num(r.onTimeCount),
        onTimePercent,
        inFullCount: num(r.inFullCount),
        inFullPercent: supplierRole ? pct(num(r.inFullCount), num(r.inFullFlags)) : null,
        // Roles with no separate in-full flag use on-time as the OTIF approximation (see class doc above).
        otifPercent: supplierRole ? pct(num(r.otifNum), num(r.otifDen)) : onTimePercent,
        issueCount: supplierRole ? num(r.issues) : 0,
        complaintsUpheld: num(r.complaintsUpheld),
        complaintsTotal: num(r.complaintsTotal),
        avgDaysLate: num(r.lateN) === 0 ? null : Math.round((num(r.lateSum) / num(r.lateN)) * 10) / 10,
      };
    });
    return { items, total: rows.length ? num(rows[0].total) : 0, page, pageSize };
  }
}
