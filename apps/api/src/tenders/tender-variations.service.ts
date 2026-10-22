import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import type { ProposeVariationDto, VariationResponseDto } from "./dto/tenders.dto";
import { appendTenderEvent } from "./tender-events";
import { TendersService } from "./tenders.service";

type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];
const num = (v: unknown) => (v == null ? null : Number(v));
const r2 = (n: number) => Math.round(n * 100) / 100;
const sameDay = (a: Date | null | undefined, b: Date | null | undefined) => (a ? a.toISOString().slice(0, 10) : "") === (b ? b.toISOString().slice(0, 10) : "");

/** Pure rule: what a proposed variation actually changes, and why it cannot be sent. */
export function variationProblems(c: { totalValue: number | null; endDate: Date | null; startDate: Date | null }, v: { newTotalValue?: number | null; newEndDate?: Date | null; termsAmendment?: string | null }): string[] {
  const out: string[] = [];
  const valueChanged = v.newTotalValue != null && r2(v.newTotalValue) !== r2(c.totalValue ?? 0);
  const endChanged = v.newEndDate != null && !sameDay(v.newEndDate, c.endDate);
  const termsChanged = !!v.termsAmendment?.trim();
  if (!valueChanged && !endChanged && !termsChanged) out.push("Change at least one thing: the contract value, the end date, or the terms.");
  if (v.newTotalValue != null && !(v.newTotalValue > 0)) out.push("The new contract value must be above zero.");
  if (v.newEndDate && c.startDate && v.newEndDate.getTime() <= c.startDate.getTime()) out.push("The new end date must be after the contract start date.");
  return out;
}

/**
 * Contract variations (step 7 part 3, 2026-10-22). After signature a contract changes only through a variation: either party proposes a change
 * (value, end date, an amendment to the terms) with a reason, the other party accepts or rejects it, and only then is the contract updated. Every
 * step is on the hash-chained timeline, the previous values are kept on the variation, and one variation may be open at a time.
 */
@Injectable()
export class TenderVariationsService {
  constructor(private readonly tenders: TendersService) {}

  private async load(tx: Tx, user: RequestUser, contractId: string) {
    const c = await tx.tenderContract.findUnique({ where: { id: contractId } });
    if (!c) throw new NotFoundException("Contract not found.");
    const party = c.organizationId === user.organizationId ? "ISSUER" : c.awardedOrganizationId === user.organizationId ? "SUPPLIER" : null;
    if (!party) throw new NotFoundException("Contract not found.");
    assertHasPermission(user, party === "ISSUER" ? "tenders.award" : "tenders.bid");
    return { c, party };
  }
  private async event(c: { organizationId: string; awardedOrganizationId: string; tenderId: string }, user: RequestUser, kind: string, summary: string, details?: unknown) {
    await appendTenderEvent({ organizationId: c.organizationId, counterpartyOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind, summary: `${summary}${c.organizationId === user.organizationId ? "" : " (supplier)"}`, details });
  }
  private async tell(c: { tenderId: string }, user: RequestUser, orgId: string, title: string, body: string) {
    await this.tenders.notifyOrgs([orgId], () => ({ title, body, link: `/bids/status?id=${c.tenderId}`, subjectId: c.tenderId }), "TENDER_AWARD", user.id);
  }

  async propose(user: RequestUser, contractId: string, dto: ProposeVariationDto) {
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const { c } = await this.load(tx, user, contractId);
      if (c.status !== "ACTIVE") throw new ConflictException("A variation can be proposed while the contract is active.");
      if (await tx.tenderContractVariation.count({ where: { contractId, status: "PROPOSED" } })) throw new ConflictException("A variation is already waiting for an answer. Withdraw it or wait for the reply first.");
      if (dto.reason.trim().length < 5) throw new BadRequestException("Give the reason for the variation.");
      const problems = variationProblems({ totalValue: num(c.totalValue), endDate: c.endDate, startDate: c.startDate }, { newTotalValue: dto.newTotalValue, newEndDate: dto.newEndDate ? new Date(dto.newEndDate) : null, termsAmendment: dto.termsAmendment });
      if (problems.length) throw new BadRequestException(problems.join(" "));
      const n = (await tx.tenderContractVariation.count({ where: { contractId } })) + 1;
      const v = await tx.tenderContractVariation.create({ data: {
        organizationId: c.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId, number: n, title: dto.title.trim(), reason: dto.reason.trim(),
        newTotalValue: dto.newTotalValue ?? null, previousTotalValue: c.totalValue, newEndDate: dto.newEndDate ? new Date(dto.newEndDate) : null, previousEndDate: c.endDate, termsAmendment: dto.termsAmendment?.trim() || null,
        proposedByOrganizationId: user.organizationId, proposedById: user.id,
      } });
      return { c, v };
    });
    const other = out.c.organizationId === user.organizationId ? out.c.awardedOrganizationId : out.c.organizationId;
    await this.event(out.c, user, "VARIATION_PROPOSED", `Variation ${out.v.number} proposed on contract ${out.c.reference}: ${out.v.title}`, { variationId: out.v.id, newTotalValue: num(out.v.newTotalValue), newEndDate: out.v.newEndDate });
    await this.tell(out.c, user, other, `Variation proposed: ${out.c.reference}`, `${out.v.title}. Review and accept or reject it on the tender's contract.`);
    return { tenderId: out.c.tenderId };
  }

  async respond(user: RequestUser, variationId: string, dto: VariationResponseDto) {
    if (!dto.accept && !dto.note?.trim()) throw new BadRequestException("Give a reason for rejecting the variation.");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const v0 = await tx.tenderContractVariation.findUnique({ where: { id: variationId } });
      if (!v0) throw new NotFoundException("Variation not found.");
      const { c } = await this.load(tx, user, v0.contractId);
      if (v0.status !== "PROPOSED") throw new ConflictException("This variation has already been answered or withdrawn.");
      if (v0.proposedByOrganizationId === user.organizationId) throw new ForbiddenException("The other party must answer your variation; you can withdraw it instead.");
      if (dto.accept && c.status !== "ACTIVE") throw new ConflictException("The contract is no longer active, so the variation cannot be applied.");
      const now = new Date();
      if (dto.accept) {
        const terms = v0.termsAmendment ? `${c.terms ? `${c.terms}\n\n` : ""}Variation ${v0.number} (${now.toISOString().slice(0, 10)}): ${v0.termsAmendment}` : c.terms;
        await tx.tenderContract.update({ where: { id: c.id }, data: { ...(v0.newTotalValue != null ? { totalValue: v0.newTotalValue } : {}), ...(v0.newEndDate ? { endDate: v0.newEndDate } : {}), terms } });
      }
      const v = await tx.tenderContractVariation.update({ where: { id: v0.id }, data: { status: dto.accept ? "ACCEPTED" : "REJECTED", respondedById: user.id, respondedAt: now, responseNote: dto.note?.trim() || null, appliedAt: dto.accept ? now : null } });
      return { c, v };
    });
    await this.event(out.c, user, out.v.status === "ACCEPTED" ? "VARIATION_ACCEPTED" : "VARIATION_REJECTED", `Variation ${out.v.number} on contract ${out.c.reference} ${out.v.status === "ACCEPTED" ? "accepted and applied" : `rejected: ${(dto.note ?? "").slice(0, 200)}`}`, { variationId: out.v.id });
    await this.tell(out.c, user, out.v.proposedByOrganizationId, `Variation ${out.v.status === "ACCEPTED" ? "accepted" : "rejected"}: ${out.c.reference}`, out.v.status === "ACCEPTED" ? `${out.v.title} has been applied to the contract.` : `${out.v.title} was rejected${dto.note ? `: ${dto.note}` : ""}.`);
    return { tenderId: out.c.tenderId };
  }

  async withdraw(user: RequestUser, variationId: string, reason: string) {
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const v0 = await tx.tenderContractVariation.findUnique({ where: { id: variationId } });
      if (!v0) throw new NotFoundException("Variation not found.");
      const { c } = await this.load(tx, user, v0.contractId);
      if (v0.status !== "PROPOSED") throw new ConflictException("Only a variation that is still waiting can be withdrawn.");
      if (v0.proposedByOrganizationId !== user.organizationId) throw new ForbiddenException("Only the party that proposed the variation can withdraw it.");
      const v = await tx.tenderContractVariation.update({ where: { id: v0.id }, data: { status: "WITHDRAWN", respondedAt: new Date(), respondedById: user.id, responseNote: reason?.trim() || null } });
      return { c, v };
    });
    await this.event(out.c, user, "VARIATION_WITHDRAWN", `Variation ${out.v.number} on contract ${out.c.reference} withdrawn`, { variationId: out.v.id });
    return { tenderId: out.c.tenderId };
  }

  /** Shaped for the contract card: the caller's side decides who may answer or withdraw. */
  static shape(rows: { id: string; contractId: string; number: number; title: string; reason: string; status: string; newTotalValue: unknown; previousTotalValue: unknown; newEndDate: Date | null; previousEndDate: Date | null; termsAmendment: string | null; proposedByOrganizationId: string; createdAt: Date; respondedAt: Date | null; responseNote: string | null; appliedAt: Date | null }[], viewerOrgId: string, names: Map<string, string>) {
    return rows.map((v) => ({
      id: v.id, contractId: v.contractId, number: v.number, title: v.title, reason: v.reason, status: v.status, proposedBy: names.get(v.proposedByOrganizationId) ?? null, byYou: v.proposedByOrganizationId === viewerOrgId,
      newTotalValue: num(v.newTotalValue), previousTotalValue: num(v.previousTotalValue), newEndDate: v.newEndDate, previousEndDate: v.previousEndDate, termsAmendment: v.termsAmendment,
      createdAt: v.createdAt, respondedAt: v.respondedAt, responseNote: v.responseNote, appliedAt: v.appliedAt,
      canRespond: v.status === "PROPOSED" && v.proposedByOrganizationId !== viewerOrgId, canWithdraw: v.status === "PROPOSED" && v.proposedByOrganizationId === viewerOrgId,
    }));
  }
}
