import { Injectable } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { CountryOption, RegionSummary } from "@universe/types";

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
      // latitude/longitude added 2026-10-09 (Stage 2, the WorldMap
      // component) -- selected alongside code/name so every existing
      // useCountries() call site can plot a point without a second
      // request. Still null for any country whose centroid hasn't been
      // seeded (see Country.latitude's doc comment in schema.prisma).
      // regionCode added 2026-10-14 alongside listRegions() below.
      select: { code: true, name: true, latitude: true, longitude: true, regionCode: true },
      orderBy: { name: "asc" },
    });
    return rows;
  }

  /**
   * Region was schema-only (built, never queried) until this round — see
   * backend-frontend-wiring-audit.md's "dead schema" findings. Global
   * reference data, same as listCountries above: not RLS-protected, plain
   * read, no withTenantContext. countryCount is a simple `_count` via the
   * reverse `countries` relation rather than a second round-trip per
   * region — there are only 6 of these, so one query with the count
   * attached is both simpler and cheaper than N+1. Routed as
   * GET /countries/regions (this controller's prefix is "countries", not
   * "geo" — the class name is the only thing called Geo).
   */
  async listRegions(): Promise<RegionSummary[]> {
    const rows = await prisma.region.findMany({
      select: { code: true, name: true, _count: { select: { countries: true } } },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ code: r.code, name: r.name, countryCount: r._count.countries }));
  }
}
