import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateProductSourceApprovalDto } from "./dto/create-product-source-approval.dto";
import { UpdateProductSourceApprovalDto } from "./dto/update-product-source-approval.dto";
import { ProductSourceApprovalsService } from "./product-source-approvals.service";
import { PartnerPerformanceService } from "./partner-performance.service";
import { QaQueueService } from "./qa-queue.service";

@Controller("quality")
@UseGuards(EntraAuthGuard)
export class QualityController {
  constructor(
    private readonly approvalsService: ProductSourceApprovalsService,
    private readonly performanceService: PartnerPerformanceService,
    private readonly qaQueueService: QaQueueService,
  ) {}

  @Get("dashboard")
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.approvalsService.getDashboard(user);
  }

  @Get("product-approvals")
  findAll(@CurrentUser() user: RequestUser, @Query("status") status?: string) {
    return this.approvalsService.findAll(user, status);
  }

  @Get("products")
  searchProducts(@CurrentUser() user: RequestUser, @Query("search") search?: string) {
    return this.approvalsService.searchProducts(user, search);
  }

  @Post("product-approvals")
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductSourceApprovalDto) {
    return this.approvalsService.create(user, dto);
  }

  @Patch("product-approvals/:id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateProductSourceApprovalDto) {
    return this.approvalsService.update(user, id, dto);
  }

  @Get("performance")
  getPerformance(@CurrentUser() user: RequestUser, @Query("roleType") roleType?: string) {
    return this.performanceService.getPerformance(user, roleType);
  }

  @Get("qa-queue")
  getQaQueue(@CurrentUser() user: RequestUser) {
    return this.qaQueueService.getQueue(user);
  }
}
