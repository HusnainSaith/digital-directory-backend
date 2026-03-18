import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityUtil } from '../../common/utils/security.util';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController extends BaseController {
  constructor(
    private readonly citiesService: CitiesService,
  ) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a city' })
  @ApiResponse({ status: 201, description: 'City created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions('cities.create')
  create(@Body() dto: CreateCityDto, @CurrentUser() user: User) {
    return this.handleAsyncOperation(this.citiesService.create(dto, user?.id));
  }

  @Get()
  @ApiOperation({ summary: 'Get all cities' })
  @ApiResponse({ status: 200, description: 'Cities list retrieved successfully' })
  @ApiQuery({ name: 'countryId', required: false, type: String, description: 'Filter by country UUID' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive cities' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('countryId') countryId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.handleAsyncOperation(
      this.citiesService.findAll({ countryId, page, limit, includeInactive: includeInactive === 'true' }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city by ID' })
  @ApiResponse({ status: 200, description: 'City retrieved successfully' })
  @ApiResponse({ status: 404, description: 'City not found' })
  findOne(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.citiesService.findOne(validId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a city' })
  @ApiResponse({ status: 200, description: 'City updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @Permissions('cities.update')
  update(@Param('id') id: string, @Body() dto: UpdateCityDto, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.citiesService.update(validId, dto, user?.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a city' })
  @ApiResponse({ status: 200, description: 'City deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @Permissions('cities.delete')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.citiesService.remove(validId, user?.id));
  }

}
