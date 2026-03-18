import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RefreshToken } from '../auth/entities/refresh-token.entity';

@Module({
  imports: [
    SubscriptionsModule,
    NotificationsModule,
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  providers: [JobsService],
})
export class JobsModule {}
