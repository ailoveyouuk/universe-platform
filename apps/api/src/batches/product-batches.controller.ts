import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateProductBatchDto, SearchProductBatchesDto, UpdateProductBatchDto } from "./dto/product-batch.dto";
import { CreateTemperatureLogDto, ReviewTemperatureLogDto } from "./dto/temperature-log.dto";
import { ProductBatchesService } from "./product-batches.service";

/** Gaps 5/6 (compliance-standards-gap-analysis.md) — a top-level resource,
 * same reasoning as RiskAssessmentsController: a batch is referenced from
 * many ProjectLines across many projects, not owned by one. */
@Controller("batches")
@UseGuards(EntraAuthGuard)
export class ProductBatchesController {
  constructor(private readonly batchesService: ProductBatchesService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductBatchDto) {
    return this.batchesService.create(user, dto);
  }

  @Get()
  search(@CurrentUser() user: RequestUser, @Query() query: SearchProductBatchesDto) {
    return this.batchesService.search(user, query);
  }

  // NOTE: route order matters here — Nest matches routes within one HTTP
  // method in declaration order, and ":id" would otherwise swallow the
  // more specific "temperature-logs/:logId/review" path below (a PATCH to
  // /batches/temperature-logs/<id>/review would match :id="temperature-logs"
  // first). The specific literal-prefixed route is declared before the
  // generic ":id" one for exactly this reason.
  @Patch("temperature-logs/:logId/review")
  reviewTemperatureLog(@CurrentUser() user: RequestUser, @Param("logId") logId: string, @Body() dto: ReviewTemperatureLogDto) {
    return this.batchesService.reviewTemperatureLog(user, logId, dto);
  }

  @Get(":id")
  getDetail(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.batchesService.getDetail(user, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateProductBatchDto) {
    return this.batchesService.update(user, id, dto);
  }

  @Post(":id/temperature-logs")
  addTemperatureLog(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CreateTemperatureLogDto) {
    return this.batchesService.addTemperatureLog(user, id, dto);
  }
}
