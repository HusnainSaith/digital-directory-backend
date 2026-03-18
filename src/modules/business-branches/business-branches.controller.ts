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
import { BusinessBranchesService } from './business-branches.service';
import { CreateBusinessBranchDto } from './dto/create-business-branch.dto';
import { UpdateBusinessBranchDto } from './dto/update-business-branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { SecurityUtil } from '../../common/utils/security.util';
import { BaseController } from '../../common/controllers/base.controller';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Business Branches')
@Controller('businesses/:businessId/branches')
export class BusinessBranchesController extends BaseController {
  constructor(private readonly branchesService: BusinessBranchesService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a branch to a business' })
  @ApiResponse({ status: 201, description: 'Branch created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessBranchDto,
    @CurrentUser() user: User,
  ) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.branchesService.create(validId, dto, user?.id));
  }

  @Get()
  @ApiOperation({ summary: 'Get all branches for a business' })
  @ApiResponse({ status: 200, description: 'Branches retrieved' })
  findAll(@Param('businessId') businessId: string) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.branchesService.findAll(validId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific branch' })
  @ApiResponse({ status: 200, description: 'Branch retrieved' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.branchesService.findOne(validId, validBId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiResponse({ status: 200, description: 'Branch updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessBranchDto,
    @CurrentUser() user: User,
  ) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.branchesService.update(validId, validBId, dto, user?.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 200, description: 'Branch deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const validBId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.branchesService.remove(validId, validBId, user?.id));
  }
}
