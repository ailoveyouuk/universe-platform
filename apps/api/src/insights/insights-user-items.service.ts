import { BadRequestException, Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { InsightsUserItem } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { SaveInsightsUserItemDto } from "./dto/insights-user-item.dto";

const MAX_VIEWS = 40;
const MAX_PINS = 12;
const MAX_STATE = 3800;

/** A person's own Insights saved views and pinned Overview highlights. Everything is scoped to the signed-in person; removing archives, never deletes. */
@Injectable()
export class InsightsUserItemsService {
  async list(user: RequestUser): Promise<InsightsUserItem[]> {
    return withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.insightsUserItem.findMany({ where: { organizationId: user.organizationId, userId: user.id, archivedAt: null }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
      return rows.map((r: any) => ({ id: r.id, kind: r.kind, name: r.name, target: r.target, state: r.stateJson ? safeParse(r.stateJson) : null, position: r.position, createdAt: r.createdAt.toISOString() }));
    });
  }

  async save(user: RequestUser, dto: SaveInsightsUserItemDto) {
    const stateJson = dto.state ? JSON.stringify(dto.state) : null;
    if (stateJson && stateJson.length > MAX_STATE) throw new BadRequestException("This view has too much saved detail. Clear a few filters and try again.");
    if (dto.kind === "VIEW" && !dto.target.startsWith("/")) throw new BadRequestException("A saved view needs a page.");
    return withTenantContext(user.organizationId, async (tx) => {
      const where = { organizationId: user.organizationId, userId: user.id, kind: dto.kind, archivedAt: null };
      const count = await tx.insightsUserItem.count({ where });
      if (count >= (dto.kind === "VIEW" ? MAX_VIEWS : MAX_PINS)) throw new BadRequestException(dto.kind === "VIEW" ? `You can save up to ${MAX_VIEWS} views. Remove one first.` : `You can pin up to ${MAX_PINS} highlights. Unpin one first.`);
      if (dto.kind === "PIN" && (await tx.insightsUserItem.count({ where: { ...where, target: dto.target } })) > 0) return { id: null, already: true };
      const r = await tx.insightsUserItem.create({ data: { organizationId: user.organizationId, userId: user.id, kind: dto.kind, name: dto.name.trim(), target: dto.target, stateJson, position: count } });
      return { id: r.id, already: false };
    });
  }

  async rename(user: RequestUser, id: string, name: string) {
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await tx.insightsUserItem.updateMany({ where: { id, organizationId: user.organizationId, userId: user.id, archivedAt: null }, data: { name: name.trim(), updatedAt: new Date() } });
      return { updated: r.count > 0 };
    });
  }

  /** Archive, never delete. */
  async remove(user: RequestUser, id: string) {
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await tx.insightsUserItem.updateMany({ where: { id, organizationId: user.organizationId, userId: user.id, archivedAt: null }, data: { archivedAt: new Date(), updatedAt: new Date() } });
      return { removed: r.count > 0 };
    });
  }
}

function safeParse(s: string): Record<string, unknown> | null { try { return JSON.parse(s); } catch { return null; } }
