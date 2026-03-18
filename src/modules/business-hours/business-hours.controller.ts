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
import { BusinessHoursService } from './business-hours.service';
import { CreateBusinessHourDto } from './dto/create-business-hour.dto';
import { UpdateBusinessHourDto } from './dto/update-business-hour.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { SecurityUtil } from '../../common/utils/security.util';
import { BaseController } from '../../common/controllers/base.controller';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Business Hours')
@Controller('businesses/:businessId/hours')
export class BusinessHoursController extends BaseController {
  constructor(private readonly hoursService: BusinessHoursService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a business hour entry' })
  @ApiResponse({ status: 201, description: 'Business hour created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessHourDto,
    @CurrentUser() user: User,
  ) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.hoursService.create(validId, dto, user?.id));
  }

  @Get()
  @ApiOperation({ summary: 'Get business hours (sorted Monâ€“Sun)' })
  @ApiResponse({ status: 200, description: 'Business hours retrieved' })
  findAll(@Param('businessId') businessId: string) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.hoursService.findAll(validId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific business hour entry' })
  @ApiResponse({ status: 200, description: 'Business hour retrieved' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.hoursService.findOne(validId, validBId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a business hour entry' })
  @ApiResponse({ status: 200, description: 'Business hour updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessHourDto,
    @CurrentUser() user: User,
  ) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.hoursService.update(validId, validBId, dto, user?.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a business hour entry' })
  @ApiResponse({ status: 200, description: 'Business hour deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.hoursService.remove(validId, validBId, user?.id));
  }
}
