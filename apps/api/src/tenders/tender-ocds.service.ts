import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { buildOcdsPackage } from "./ocds";
import { TendersService } from "./tenders.service";

/** OCDS release package for a tender the caller owns (2026-10-22). Read-only; sealed bids stay out until the bids are opened. */
@Injectable()
export class TenderOcdsService {
  constructor(private readonly tenders: TendersService) {}

  async exportPackage(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      const lines = await tx.tenderLine.findMany({ where: { tenderId }, orderBy: { lineNumber: "asc" } });
      const bids = t.bidsOpenedAt ? await tx.tenderBid.findMany({ where: { tenderId, status: "SUBMITTED", issuerOrganizationId: user.organizationId }, select: { id: true, organizationId: true, totalTenderCurrency: true } }) : [];
      const awards = await tx.tenderAward.findMany({ where: { tenderId, organizationId: user.organizationId } });
      const awardIds = awards.map((a) => a.id);
      const contracts = awardIds.length ? await tx.tenderContract.findMany({ where: { tenderId, organizationId: user.organizationId, awardId: { in: awardIds } } }) : [];
      const cids = contracts.map((c) => c.id);
      const milestones = cids.length ? await tx.tenderContractMilestone.findMany({ where: { contractId: { in: cids } }, orderBy: { sortOrder: "asc" } }) : [];
      const variations = cids.length ? await tx.tenderContractVariation.findMany({ where: { contractId: { in: cids } }, orderBy: { number: "asc" } }) : [];
      const orgIds = [...new Set([user.organizationId, ...bids.map((b) => b.organizationId), ...awards.map((a) => a.awardedOrganizationId)])];
      const orgs = await tx.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } });
      const codes = [...new Set(lines.map((l) => l.destinationCountryCode).filter((c): c is string => !!c))];
      const countries = codes.length ? await tx.country.findMany({ where: { code: { in: codes } }, select: { code: true, name: true } }) : [];
      const bidById = new Map(bids.map((b) => [b.id, b]));
      return buildOcdsPackage({
        baseUrl: process.env.TENDERS_APP_URL || undefined,
        tender: t,
        buyer: { id: user.organizationId, name: orgs.find((o) => o.id === user.organizationId)?.name ?? "Buyer" },
        lines,
        countryNames: Object.fromEntries(countries.map((c) => [c.code, c.name])),
        submittedBids: bids,
        orgNames: Object.fromEntries(orgs.map((o) => [o.id, o.name])),
        awards: awards.map((a) => ({ id: a.id, awardedOrganizationId: a.awardedOrganizationId, awardedAt: a.awardedAt, valueAmount: bidById.get(a.bidId)?.totalTenderCurrency ? Number(bidById.get(a.bidId)!.totalTenderCurrency!.toString()) : null, currency: t.currency })),
        contracts: contracts.map((c) => ({ ...c, milestones: milestones.filter((m) => m.contractId === c.id), variations: variations.filter((v) => v.contractId === c.id) })),
      });
    });
  }
}
