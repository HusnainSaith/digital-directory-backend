import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessMediaService } from './business-media.service';
import { BusinessMediaController } from './business-media.controller';
import { BusinessMedia } from './entities/business-media.entity';
import { SharedModule } from '../shared/shared.module';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessMedia]),
    SharedModule,
    GuardsModule,
    NotificationsModule,
  ],
  controllers: [BusinessMediaController],
  providers: [BusinessMediaService],
  exports: [BusinessMediaService],
})
export class BusinessMediaModule {}
