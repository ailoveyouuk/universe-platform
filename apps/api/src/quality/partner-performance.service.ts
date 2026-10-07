import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { PartnerPerformanceMetric } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";

const PERFORMANCE_ROLE_TYPES = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER"] as const;
type PerformanceRoleType = (typeof PERFORMANCE_ROLE_TYPES)[number];

function daysLate(promised: Date | null, actual: Date | null): number | null {
  if (!promised || !actual) return null;
  const ms = actual.getTime() - promised.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  // Floored at 0 — see PartnerPerformanceMetric.avgDaysLate's doc comment
  // in packages/types: an early delivery is not "negative days late".
  return days > 0 ? days : 0;
}

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
  async getPerformance(user: RequestUser, roleType?: string): Promise<PartnerPerformanceMetric[]> {
    const roleTypes: PerformanceRoleType[] = roleType
      ? (PERFORMANCE_ROLE_TYPES.filter((r) => r === roleType) as PerformanceRoleType[])
      : [...PERFORMANCE_ROLE_TYPES];
    if (roleTypes.length === 0) return [];

    return withTenantContext(user.organizationId, async (tx) => {
      const partners = await tx.partner.findMany({
        where: {
          ...tenantScope(user.organizationId),
          isArchived: false,
          roles: { some: { roleType: { in: roleTypes }, isActive: true } },
        },
        include: { roles: true },
      });

      const lines = await tx.projectLine.findMany({
        where: tenantScope(user.organizationId),
        select: {
          projectId: true,
          manufacturerId: true,
          supplierId: true,
          internalOnTime: true,
          supplierOnTime: true,
          supplierInFull: true,
          projectedDeliveryDate: true,
          actualDeliveryDate: true,
        },
      });

      // freightForwarderId moved from ProjectLine to Project 2026-10-03 —
      // see Project's "Freight & Logistics" doc comment in schema.prisma.
      // A FREIGHT_FORWARDER's "lines" are now every line belonging to a
      // project where that partner is the project's own freight forwarder,
      // not a per-line match any more.
      const freightForwarderByProject = new Map<string, string | null>(
        (
          await tx.project.findMany({
            where: tenantScope(user.organizationId),
            select: { id: true, freightForwarderId: true },
          })
        ).map((p) => [p.id, p.freightForwarderId]),
      );

      const enquiries = await tx.supplierEnquiry.findMany({
        where: tenantScope(user.organizationId),
        select: { supplierId: true, responseStatus: true },
      });

      const results: PartnerPerformanceMetric[] = [];

      for (const partner of partners) {
        const activeRoleTypes = partner.roles
          .filter((r) => r.isActive && (roleTypes as string[]).includes(r.roleType))
          .map((r) => r.roleType as PerformanceRoleType);

        for (const role of activeRoleTypes) {
          const roleLines = lines.filter((l) =>
            role === "MANUFACTURER"
              ? l.manufacturerId === partner.id
              : role === "SUPPLIER"
                ? l.supplierId === partner.id
                : freightForwarderByProject.get(l.projectId) === partner.id,
          );

          const onTimeFlags = roleLines
            .map((l) => (role === "SUPPLIER" ? l.supplierOnTime : l.internalOnTime))
            .filter((v): v is boolean => v !== null && v !== undefined);
          const onTimeCount = onTimeFlags.filter(Boolean).length;
          const onTimePercent = pct(onTimeCount, onTimeFlags.length);

          const inFullFlags =
            role === "SUPPLIER"
              ? roleLines.map((l) => l.supplierInFull).filter((v): v is boolean => v !== null && v !== undefined)
              : [];
          const inFullCount = inFullFlags.filter(Boolean).length;
          const inFullPercent = role === "SUPPLIER" ? pct(inFullCount, inFullFlags.length) : null;

          const otifPercent =
            role === "SUPPLIER"
              ? pct(
                  roleLines.filter((l) => l.supplierOnTime === true && l.supplierInFull === true).length,
                  roleLines.filter((l) => l.supplierOnTime !== null && l.supplierInFull !== null).length,
                )
              : onTimePercent; // approximation for roles with no separate in-full flag — see class doc comment

          const lateSpans = roleLines
            .map((l) => daysLate(l.projectedDeliveryDate, l.actualDeliveryDate))
            .filter((v): v is number => v !== null);
          const avgDaysLate =
            lateSpans.length === 0 ? null : Math.round((lateSpans.reduce((a, b) => a + b, 0) / lateSpans.length) * 10) / 10;

          const issueCount =
            role === "SUPPLIER"
              ? enquiries.filter(
                  (e) => e.supplierId === partner.id && (e.responseStatus === "DECLINED" || e.responseStatus === "NO_RESPONSE"),
                ).length
              : 0;

          results.push({
            partnerId: partner.id,
            partnerName: partner.name,
            roleType: role,
            totalLines: roleLines.length,
            onTimeCount,
            onTimePercent,
            inFullCount,
            inFullPercent,
            otifPercent,
            issueCount,
            avgDaysLate,
          });
        }
      }

      return results.sort((a, b) => b.totalLines - a.totalLines);
    });
  }
}
