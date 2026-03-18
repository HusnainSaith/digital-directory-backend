import { Controller, Get, Query, Req, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { SearchService } from './search.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { Request } from 'express';

@ApiTags('Search')
@Controller('search')
export class SearchController extends BaseController {
  constructor(private readonly searchService: SearchService) {
    super();
  }

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Public search with filters' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiQuery({ name: 'q', required: false, description: 'Search keyword' })
  @ApiQuery({ name: 'cityId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'serviceType', required: false, description: 'Filter by product/service type keyword' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['relevance', 'name'] })
  search(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('cityId') cityId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('serviceType') serviceType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'relevance' | 'name',
  ) {
    // Country is always from subdomain resolution — cannot be overridden by public users (SRS §3.7)
    const resolvedCountryId = req.country?.id;

    return this.handleAsyncOperation(
      this.searchService.search({
        q,
        countryId: resolvedCountryId,
        cityId,
        categoryId,
        serviceType,
        page,
        limit,
        sortBy,
      }),
    );
  }

  @Get('suggestions')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 seconds
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Typeahead search suggestions' })
  @ApiResponse({ status: 200, description: 'Search suggestions retrieved successfully' })
  @ApiQuery({ name: 'q', required: true, description: 'Search prefix' })
  suggestions(@Query('q') q: string) {
    return this.handleAsyncOperation(this.searchService.suggestions(q));
  }
}
