import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BusinessServicesService } from './business-services.service';
import { CreateBusinessServiceDto } from './dto/create-business-service.dto';
import { UpdateBusinessServiceDto } from './dto/update-business-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { SecurityUtil } from '../../common/utils/security.util';
import { BaseController } from '../../common/controllers/base.controller';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Business Services')
@Controller('businesses/:businessId/services')
export class BusinessServicesController extends BaseController {
  constructor(private readonly servicesService: BusinessServicesService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a service to a business' })
  @ApiResponse({ status: 201, description: 'Service created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessServiceDto,
    @CurrentUser() user: User,
  ) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.servicesService.create(validId, dto, user?.id));
  }

  @Get()
  @ApiOperation({ summary: 'Get all services for a business' })
  @ApiResponse({ status: 200, description: 'Services retrieved' })
  findAll(@Param('businessId') businessId: string) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.servicesService.findAll(validId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific service' })
  @ApiResponse({ status: 200, description: 'Service retrieved' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.servicesService.findOne(validId, validBId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessServiceDto,
    @CurrentUser() user: User,
  ) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.servicesService.update(validId, validBId, dto, user?.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a service' })
  @ApiResponse({ status: 200, description: 'Service deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.servicesService.remove(validId, validBId, user?.id));
  }
}
