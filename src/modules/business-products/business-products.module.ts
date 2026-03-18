import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessProductsService } from './business-products.service';
import { BusinessProductsController } from './business-products.controller';
import { BusinessProduct } from '../businesses/entities/business-product.entity';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessProduct]), GuardsModule, NotificationsModule],
  controllers: [BusinessProductsController],
  providers: [BusinessProductsService],
  exports: [BusinessProductsService],
})
export class BusinessProductsModule {}
