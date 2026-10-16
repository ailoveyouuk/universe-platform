import { Module } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { StakeholderAccessController } from "./stakeholder-access.controller";
import { StakeholderAccessService } from "./stakeholder-access.service";

@Module({
  controllers: [StakeholderAccessController],
  providers: [StakeholderAccessService, UsersService],
})
export class StakeholderAccessModule {}
