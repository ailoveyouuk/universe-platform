import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { SupplierEnquiriesController } from "./supplier-enquiries.controller";
import { SupplierEnquiriesService } from "./supplier-enquiries.service";

@Module({
  imports: [ProjectsModule],
  controllers: [SupplierEnquiriesController],
  providers: [SupplierEnquiriesService],
})
export class SupplierEnquiriesModule {}
