import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessHoursService } from './business-hours.service';
import { BusinessHoursController } from './business-hours.controller';
import { BusinessHour } from '../businesses/entities/business-hour.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessHour]),
    GuardsModule,
    NotificationsModule,
  ],
  controllers: [BusinessHoursController],
  providers: [BusinessHoursService],
  exports: [BusinessHoursService],
})
export class BusinessHoursModule {}
