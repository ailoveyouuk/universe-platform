import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { rateLimit } from "../common/rate-limit";
import { PharmaReferenceService } from "./pharma-reference.service";

@Controller("pharma-reference")
@UseGuards(EntraAuthGuard)
export class PharmaReferenceController {
  constructor(private readonly ref: PharmaReferenceService) {}
  @Get("summary") summary(@CurrentUser() u: RequestUser) { return this.ref.summary(u.inDemoOrganization === true); }
  @Get("search")
  search(@CurrentUser() u: RequestUser, @Query("q") q?: string, @Query("source") source?: string, @Query("atc") atc?: string, @Query("status") status?: string, @Query("type") type?: string, @Query("holder") holder?: string, @Query("generic") generic?: string, @Query("biosimilar") biosimilar?: string, @Query("orphan") orphan?: string, @Query("linked") linked?: string, @Query("skip") skip?: string, @Query("take") take?: string) {
    rateLimit(u.id, "pharma-search", 600, 3_600_000);
    return this.ref.search({ q, source, atc, status, type, holder, generic: generic === "true", biosimilar: biosimilar === "true", orphan: orphan === "true", linked: linked === "YES" || linked === "NO" ? linked : undefined, skip: skip ? Number(skip) : 0, take: take ? Number(take) : 50 }, u.inDemoOrganization === true);
  }
  @Get(":id") get(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.ref.get(id, u.inDemoOrganization === true); }
}
