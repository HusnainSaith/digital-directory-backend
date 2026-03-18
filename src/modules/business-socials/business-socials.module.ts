import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessSocialsService } from './business-socials.service';
import { BusinessSocialsController } from './business-socials.controller';
import { BusinessSocial } from '../businesses/entities/business-social.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessSocial]),
    GuardsModule,
    NotificationsModule,
  ],
  controllers: [BusinessSocialsController],
  providers: [BusinessSocialsService],
  exports: [BusinessSocialsService],
})
export class BusinessSocialsModule {}
