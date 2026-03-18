import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Business } from '../businesses/entities/business.entity';
import { Category } from '../categories/entities/category.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Business, Category, Subscription])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
