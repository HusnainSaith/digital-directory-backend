import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { City } from './entities/city.entity';
import { SharedModule } from '../shared/shared.module';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([City]),
    SharedModule,
    GuardsModule,
    NotificationsModule,
  ],
  controllers: [CitiesController],
  providers: [CitiesService],
  exports: [CitiesService, TypeOrmModule],
})
export class CitiesModule {}
