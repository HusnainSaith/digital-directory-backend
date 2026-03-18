import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RoleEnum } from '../roles/role.enum';
import { SecurityUtil } from '../../common/utils/security.util';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiTags('permissions')
@Controller('permissions')
export class PermissionsController extends BaseController {
  constructor(private readonly permissionsService: PermissionsService) {
    super();
  }

  @Post()
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Roles(RoleEnum.ADMIN)
  @Permissions('permissions.create')
  create(@Body() dto: CreatePermissionDto) {
    return this.handleAsyncOperation(this.permissionsService.create(dto));
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @Permissions('permissions.read')
  @ApiOperation({ summary: 'Retrieve all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.handleAsyncOperation(this.permissionsService.findAll({ page, limit }));
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @Permissions('permissions.read')
  @ApiOperation({ summary: 'Retrieve a specific permission' })
  @ApiResponse({ status: 200, description: 'Permission retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  findOne(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.permissionsService.findOne(validId));
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @Permissions('permissions.update')
  @ApiOperation({ summary: 'Update a specific permission' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @Roles(RoleEnum.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.permissionsService.update(validId, dto),
    );
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @Permissions('permissions.delete')
  @ApiOperation({ summary: 'Delete a specific permission' })
  @ApiResponse({ status: 200, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: string) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.permissionsService.remove(validId));
  }
}
