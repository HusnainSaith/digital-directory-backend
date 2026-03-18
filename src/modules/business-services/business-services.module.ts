import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessServicesService } from './business-services.service';
import { BusinessServicesController } from './business-services.controller';
import { BusinessService as BusinessServiceEntity } from '../businesses/entities/business-service.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessServiceEntity]), GuardsModule, NotificationsModule],
  controllers: [BusinessServicesController],
  providers: [BusinessServicesService],
  exports: [BusinessServicesService],
})
export class BusinessServicesModule {}
