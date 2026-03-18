import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Review } from '../reviews/entities/review.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SharedModule } from '../shared/shared.module';
import { GuardsModule } from '../../common/modules/guards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, User, RefreshToken, Subscription, Payment, Review, SubscriptionPlan]),
    NotificationsModule,
    AuditLogsModule,
    SharedModule,
    GuardsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
