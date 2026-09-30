import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CreateSupplierEnquiryDto } from "./dto/create-supplier-enquiry.dto";
import { UpdateSupplierEnquiryDto } from "./dto/update-supplier-enquiry.dto";
import { SupplierEnquiriesService } from "./supplier-enquiries.service";

/** Nested under a project's line, not its own top-level resource — an
 * enquiry only ever makes sense in the context of the line it's RFQ-ing
 * suppliers for. Every response is the full ProjectDetail (same shape
 * GET /projects/:id already returns) — see SupplierEnquiriesService's doc
 * comment. */
@Controller("projects/:projectId/lines/:lineId/enquiries")
@UseGuards(EntraAuthGuard)
export class SupplierEnquiriesController {
  constructor(private readonly supplierEnquiriesService: SupplierEnquiriesService) {}

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("lineId") lineId: string,
    @Body() dto: CreateSupplierEnquiryDto,
  ) {
    return this.supplierEnquiriesService.create(user, projectId, lineId, dto);
  }

  @Patch(":enquiryId")
  update(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("lineId") lineId: string,
    @Param("enquiryId") enquiryId: string,
    @Body() dto: UpdateSupplierEnquiryDto,
  ) {
    return this.supplierEnquiriesService.update(user, projectId, lineId, enquiryId, dto);
  }
}
