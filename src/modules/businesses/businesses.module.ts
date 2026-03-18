import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { Business } from './entities/business.entity';
import { BusinessSocial } from './entities/business-social.entity';
import { BusinessHour } from './entities/business-hour.entity';
import { BusinessService } from './entities/business-service.entity';
import { BusinessProduct } from './entities/business-product.entity';
import { BusinessBranch } from './entities/business-branch.entity';
import { BusinessRelated } from './entities/business-related.entity';
import { Category } from '../categories/entities/category.entity';
import { SharedModule } from '../shared/shared.module';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      BusinessSocial,
      BusinessHour,
      BusinessService,
      BusinessProduct,
      BusinessBranch,
      BusinessRelated,
      Category,
      User,
    ]),
    SharedModule,
    GuardsModule,
    NotificationsModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService, TypeOrmModule],
})
export class BusinessesModule {}
