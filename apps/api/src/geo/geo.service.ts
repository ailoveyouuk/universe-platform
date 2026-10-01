import { Injectable } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { CountryOption } from "@universe/types";

/**
 * Country/Region are global reference data (see schema.prisma's note on
 * Country/Region not being tenant-scoped) — not RLS-protected, so this is
 * a plain read with no withTenantContext wrapper, same reasoning already
 * established for ProductMaster reads in ProductSourceApprovalsService.
 *
 * Added 2026-10-01 so the New Stakeholder form (and any other country
 * field) can offer a real searchable country picker instead of a free-text
 * "type the ISO alpha-2 code yourself" field, which Lewis pointed out no
 * organization using the platform will actually know or want to type.
 */
@Injectable()
export class GeoService {
  async listCountries(): Promise<CountryOption[]> {
    const rows = await prisma.country.findMany({
      select: { code: true, name: true },
      orderBy: { name: "asc" },
    });
    return rows;
  }
}
