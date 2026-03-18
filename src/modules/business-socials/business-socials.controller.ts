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
import { BusinessSocialsService } from './business-socials.service';
import { CreateBusinessSocialDto } from './dto/create-business-social.dto';
import { UpdateBusinessSocialDto } from './dto/update-business-social.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { SecurityUtil } from '../../common/utils/security.util';
import { BaseController } from '../../common/controllers/base.controller';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Business Socials')
@Controller('businesses/:businessId/socials')
export class BusinessSocialsController extends BaseController {
  constructor(private readonly socialsService: BusinessSocialsService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a social media link to a business' })
  @ApiResponse({ status: 201, description: 'Social link created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessSocialDto,
    @CurrentUser() user: User,
  ) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.socialsService.create(validId, dto, user?.id));
  }

  @Get()
  @ApiOperation({ summary: 'Get all social links for a business' })
  @ApiResponse({ status: 200, description: 'Social links retrieved' })
  findAll(@Param('businessId') businessId: string) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.socialsService.findAll(validId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific social link' })
  @ApiResponse({ status: 200, description: 'Social link retrieved' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.socialsService.findOne(validId, validBId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a social media link' })
  @ApiResponse({ status: 200, description: 'Social link updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessSocialDto,
    @CurrentUser() user: User,
  ) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.socialsService.update(validId, validBId, dto, user?.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a social media link' })
  @ApiResponse({ status: 200, description: 'Social link deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.socialsService.remove(validId, validBId, user?.id));
  }
}
