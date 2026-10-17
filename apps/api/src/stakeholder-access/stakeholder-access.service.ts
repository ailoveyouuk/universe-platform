import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ensureStakeholderDemoRole, STAKEHOLDER_DEMO_ROLE_NAME, withPlatformStaffContext } from "@universe/db";
import type { StakeholderAccessOverview, UserSummary } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { seedSimulatedAggregates } from "@universe/insights-db";
import { assertPlatformStaff } from "../common/authorization";
import { UsersService } from "../users/users.service";
import type { GrantStakeholderAccessDto } from "./dto/grant-stakeholder-access.dto";

/**
 * Stakeholder demo access (2026-10-17). Platform staff give a prospective
 * organisation's person access to the demo organisation by email, with the
 * "Stakeholder Demo" role, and can switch it off again. Switching off is the
 * normal archive of the account (never a delete): it is logged, reversible,
 * and uses the existing users endpoints. Everything here is platform-staff
 * only.
 */
@Injectable()
export class StakeholderAccessService {
  constructor(private readonly users: UsersService) {}

  private async demoOrganisation() {
    const org = await withPlatformStaffContext((tx) => tx.organization.findFirst({ where: { isDemo: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } }));
    if (!org) throw new NotFoundException("There is no demo organisation.");
    return org;
  }

  async overview(caller: RequestUser): Promise<StakeholderAccessOverview> {
    assertPlatformStaff(caller);
    const org = await this.demoOrganisation();
    const all = await this.users.findAll(caller, org.id);
    return {
      organizationId: org.id,
      organizationName: org.name,
      users: all.filter((u) => u.roleNames.includes(STAKEHOLDER_DEMO_ROLE_NAME)),
    };
  }

  async seedDemoBenchmarks(caller: RequestUser) {
    assertPlatformStaff(caller);
    try {
      return await seedSimulatedAggregates();
    } catch (err) {
      // Platform-staff-only action: surface the real cause rather than a bare 500.
      throw new BadRequestException(`Seeding benchmark data failed: ${err instanceof Error ? err.message.slice(0, 600) : String(err)}`);
    }
  }

  async grant(caller: RequestUser, dto: GrantStakeholderAccessDto): Promise<UserSummary> {
    assertPlatformStaff(caller);
    const org = await this.demoOrganisation();
    const role = await ensureStakeholderDemoRole(org.id);
    return this.users.invite(caller, {
      email: dto.email,
      forename: dto.forename,
      surname: dto.surname,
      organizationId: org.id,
      roleIds: [role.id],
    });
  }
}
