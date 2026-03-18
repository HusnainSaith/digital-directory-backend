import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { RoleEnum } from '../roles/role.enum';
import { BaseController } from '../../common/controllers/base.controller';

@ApiTags('Role Permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('role-permissions')
export class RolePermissionsController extends BaseController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {
    super();
  }

  @Post(':roleId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiResponse({ status: 201, description: 'Permissions assigned to role successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @Roles(RoleEnum.ADMIN)
  @Permissions('role-permissions.assign')
  assignPermissions(
    @Param('roleId') roleId: string,
    @Body() dto: AssignRolePermissionsDto,
  ) {
    return this.handleAsyncOperation(this.rolePermissionsService.assignPermissions(roleId, dto));
  }

  @Get(':roleId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Retrieve permissions for a role' })
  @ApiResponse({ status: 200, description: 'Role permissions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @Roles(RoleEnum.ADMIN)
  @Permissions('role-permissions.read')
  getPermissions(@Param('roleId') roleId: string) {
    return this.handleAsyncOperation(this.rolePermissionsService.getPermissionsByRole(roleId));
  }

  @Delete(':roleId/:permissionId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove a permission from a role' })
  @ApiResponse({ status: 200, description: 'Permission removed from role successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Role or permission not found' })
  @Roles(RoleEnum.ADMIN)
  @Permissions('role-permissions.delete')
  removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.handleAsyncOperation(this.rolePermissionsService.removePermission(roleId, permissionId));
  }
}
