import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesService } from './countries.service';
import { CountriesController } from './countries.controller';
import { Country } from './entities/country.entity';
import { SharedModule } from '../shared/shared.module';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Country]),
    SharedModule,
    GuardsModule,
    NotificationsModule,
  ],
  controllers: [CountriesController],
  providers: [CountriesService],
  exports: [CountriesService, TypeOrmModule],
})
export class CountriesModule {}
