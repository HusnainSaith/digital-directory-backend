import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessCardsService } from './business-cards.service';
import { BusinessCardsController } from './business-cards.controller';
import { BusinessCard } from './entities/business-card.entity';
import { SharedModule } from '../shared/shared.module';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessCard]),
    SharedModule,
    GuardsModule,
    NotificationsModule,
  ],
  controllers: [BusinessCardsController],
  providers: [BusinessCardsService],
  exports: [BusinessCardsService],
})
export class BusinessCardsModule {}
