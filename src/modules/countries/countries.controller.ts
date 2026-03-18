import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../roles/role.enum';
import { SecurityUtil } from '../../common/utils/security.util';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController extends BaseController {
  constructor(
    private readonly countriesService: CountriesService,
  ) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a country (super_admin only)' })
  @ApiResponse({ status: 201, description: 'Country created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateCountryDto, @CurrentUser() user: User) {
    return this.handleAsyncOperation(this.countriesService.create(dto, user?.id));
  }

  @Get()
  @ApiOperation({ summary: 'List all active countries' })
  @ApiResponse({ status: 200, description: 'Countries list retrieved successfully' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Include inactive countries' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.handleAsyncOperation(this.countriesService.findAll({ includeInactive: includeInactive === 'true' }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get country by ID' })
  @ApiResponse({ status: 200, description: 'Country retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  findOne(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.countriesService.findOne(validId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a country (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Country updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.countriesService.update(validId, dto, user?.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(RoleEnum.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate a country (super_admin only)' })
  @ApiResponse({ status: 200, description: 'Country deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.countriesService.remove(validId, user?.id));
  }
}
