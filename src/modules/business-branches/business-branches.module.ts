import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessBranchesService } from './business-branches.service';
import { BusinessBranchesController } from './business-branches.controller';
import { BusinessBranch } from '../businesses/entities/business-branch.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessBranch]),
    GuardsModule,
    NotificationsModule,
  ],
  controllers: [BusinessBranchesController],
  providers: [BusinessBranchesService],
  exports: [BusinessBranchesService],
})
export class BusinessBranchesModule {}
