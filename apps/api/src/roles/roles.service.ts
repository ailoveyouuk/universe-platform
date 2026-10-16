import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { PermissionSummary, RoleDetail } from "@universe/types";
import { assertCanManageOrg } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import type { CreateRoleDto, UpdateRoleDto } from "./dto/role.dto";

type Tx = any;
const PERMISSION = "org.roles.manage";

const roleInclude = {
  rolePermissions: { include: { permission: true } },
  _count: { select: { userRoles: true } },
} as const;

function toDetail(r: any): RoleDetail {
  return {
    id: r.id,
    organizationId: r.organizationId,
    name: r.name,
    description: r.description ?? null,
    appScope: r.appScope,
    permissionKeys: r.rolePermissions.map((rp: any) => rp.permission.key).sort(),
    userCount: r._count.userRoles,
  };
}

function runFor<T>(caller: RequestUser, organizationId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn);
}

/**
 * Role & permission management. Until 2026-10-16 role permission grants could
 * only be changed by editing packages/db/src/organizations.ts and running a
 * backfill script, and org.roles.manage guarded nothing. Guard rails:
 *  - org.roles.manage on the target organisation (platform staff exempt).
 *  - No privilege escalation: a non-platform caller can only grant
 *    permissions they hold themselves.
 *  - No lock-out: after any change that could remove access, the
 *    organisation must still have at least one non-deactivated user holding
 *    org.roles.manage (platform staff can always recover, so are exempt).
 *  - A role with users assigned cannot be deleted.
 *  - Every change is written to FieldChangeLog (table "roles").
 */
@Injectable()
export class RolesService {
  async listPermissions(caller: RequestUser): Promise<PermissionSummary[]> {
    if (caller.platformStaffRole === "NONE" && !caller.permissions.includes(PERMISSION)) {
      throw new ForbiddenException(`Missing permission: ${PERMISSION}`);
    }
    const rows = await prisma.permission.findMany({ orderBy: { key: "asc" } });
    return rows.map((p) => ({ key: p.key, description: p.description ?? "" }));
  }

  async list(caller: RequestUser, organizationId?: string): Promise<RoleDetail[]> {
    const orgId = caller.platformStaffRole !== "NONE" ? organizationId : caller.organizationId;
    if (!orgId) throw new BadRequestException("organizationId is required");
    assertCanManageOrg(caller, orgId, PERMISSION);
    const rows: any[] = await runFor(caller, orgId, (tx) =>
      tx.role.findMany({ where: { organizationId: orgId }, include: roleInclude, orderBy: { name: "asc" } }),
    );
    return rows.map(toDetail);
  }

  private async resolvePermissions(tx: Tx, keys: string[]) {
    const perms = await tx.permission.findMany({ where: { key: { in: keys } } });
    const known = new Set(perms.map((p: any) => p.key));
    const unknown = keys.filter((k) => !known.has(k));
    if (unknown.length) throw new BadRequestException(`Unknown permission(s): ${unknown.join(", ")}`);
    return perms as { id: string; key: string }[];
  }

  private assertNoEscalation(caller: RequestUser, keys: string[]) {
    if (caller.platformStaffRole !== "NONE") return;
    const missing = keys.filter((k) => !caller.permissions.includes(k));
    if (missing.length) {
      throw new ForbiddenException(`You can't grant permissions you don't hold yourself: ${missing.join(", ")}`);
    }
  }

  /** Throws if the org would be left with nobody able to manage roles. */
  private async assertNotLockedOut(caller: RequestUser, tx: Tx, organizationId: string) {
    if (caller.platformStaffRole !== "NONE") return;
    const holders = await tx.user.count({
      where: {
        organizationId,
        status: { not: "DEACTIVATED" },
        userRoles: { some: { role: { rolePermissions: { some: { permission: { key: PERMISSION } } } } } },
      },
    });
    if (holders === 0) {
      throw new BadRequestException(
        "That change would leave the organisation with no one able to manage roles. Keep org.roles.manage on at least one role that has a user assigned.",
      );
    }
  }

  async create(caller: RequestUser, dto: CreateRoleDto): Promise<RoleDetail> {
    assertCanManageOrg(caller, dto.organizationId, PERMISSION);
    this.assertNoEscalation(caller, dto.permissionKeys);
    const appScope = dto.appScope ?? "*";
    return runFor(caller, dto.organizationId, async (tx) => {
      const clash = await tx.role.findFirst({ where: { organizationId: dto.organizationId, name: dto.name, appScope } });
      if (clash) throw new ConflictException(`A role named "${dto.name}" already exists for that app scope.`);
      const perms = await this.resolvePermissions(tx, dto.permissionKeys);
      const created = await tx.role.create({
        data: {
          organizationId: dto.organizationId,
          name: dto.name.trim(),
          description: dto.description ?? null,
          appScope,
          rolePermissions: { create: perms.map((p) => ({ permissionId: p.id })) },
        },
        include: roleInclude,
      });
      await recordFieldChanges(tx, {
        organizationId: dto.organizationId,
        tableName: "roles",
        recordId: created.id,
        changedById: caller.id,
        changes: [
          { field: "role", oldValue: null, newValue: created.name },
          { field: "permissions", oldValue: null, newValue: [...dto.permissionKeys].sort().join(", ") || null },
        ],
        source: "API",
      });
      return toDetail(created);
    });
  }

  async update(caller: RequestUser, id: string, dto: UpdateRoleDto): Promise<RoleDetail> {
    return runFor(caller, caller.organizationId, async (tx) => {
      const role = await tx.role.findUnique({ where: { id }, include: roleInclude });
      if (!role || !role.organizationId) throw new NotFoundException(`Role ${id} not found`);
      assertCanManageOrg(caller, role.organizationId, PERMISSION);

      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
      const data: Record<string, unknown> = {};

      if (dto.name !== undefined && dto.name.trim() !== role.name) {
        const clash = await tx.role.findFirst({ where: { organizationId: role.organizationId, name: dto.name.trim(), appScope: role.appScope, NOT: { id } } });
        if (clash) throw new ConflictException(`A role named "${dto.name}" already exists for that app scope.`);
        data.name = dto.name.trim();
        changes.push({ field: "name", oldValue: role.name, newValue: dto.name.trim() });
      }
      if (dto.description !== undefined && (dto.description ?? null) !== (role.description ?? null)) {
        data.description = dto.description;
        changes.push({ field: "description", oldValue: role.description ?? null, newValue: dto.description ?? null });
      }

      let permissionsChanged = false;
      if (dto.permissionKeys !== undefined) {
        const before = role.rolePermissions.map((rp: any) => rp.permission.key).sort();
        const after = [...dto.permissionKeys].sort();
        if (before.join() !== after.join()) {
          // Only newly added permissions need the escalation check; removing is always allowed (subject to lock-out below).
          this.assertNoEscalation(caller, after.filter((k) => !before.includes(k)));
          const perms = await this.resolvePermissions(tx, after);
          await tx.rolePermission.deleteMany({ where: { roleId: id } });
          if (perms.length) await tx.rolePermission.createMany({ data: perms.map((p) => ({ roleId: id, permissionId: p.id })) });
          changes.push({ field: "permissions", oldValue: before.join(", ") || null, newValue: after.join(", ") || null });
          permissionsChanged = true;
        }
      }

      if (Object.keys(data).length) await tx.role.update({ where: { id }, data });
      if (permissionsChanged) await this.assertNotLockedOut(caller, tx, role.organizationId);

      await recordFieldChanges(tx, {
        organizationId: role.organizationId,
        tableName: "roles",
        recordId: id,
        changedById: caller.id,
        changes,
        source: "API",
      });
      return toDetail(await tx.role.findUnique({ where: { id }, include: roleInclude }));
    });
  }

  async remove(caller: RequestUser, id: string): Promise<{ deleted: true }> {
    return runFor(caller, caller.organizationId, async (tx) => {
      const role = await tx.role.findUnique({ where: { id }, include: roleInclude });
      if (!role || !role.organizationId) throw new NotFoundException(`Role ${id} not found`);
      assertCanManageOrg(caller, role.organizationId, PERMISSION);
      if (role._count.userRoles > 0) {
        throw new ConflictException(`${role._count.userRoles} user(s) still have this role. Reassign them first.`);
      }
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
      await recordFieldChanges(tx, {
        organizationId: role.organizationId,
        tableName: "roles",
        recordId: id,
        changedById: caller.id,
        changes: [{ field: "role", oldValue: role.name, newValue: null }],
        source: "API",
      });
      return { deleted: true as const };
    });
  }
}
