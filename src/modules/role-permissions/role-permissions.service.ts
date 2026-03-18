import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RolePermission } from './entities/role-permission.entity';
import { AssignRolePermissionsDto } from './dto/assign-role-permissions.dto';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { SecurityUtil } from 'src/common/utils/security.util';

@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);

  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async assignPermissions(roleId: string, dto: AssignRolePermissionsDto) {
    // 1. Validate the role exists.
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // 2. Validate all permission IDs in the DTO exist.
    const permissions = await this.permissionRepo.find({
      where: { id: In(dto.permissionIds) },
    });
    if (permissions.length !== dto.permissionIds.length) {
      throw new NotFoundException(`Some permissions were not found`);
    }

    // 3. Find permissions that are already assigned to this role.
    const existingPermissions = await this.rolePermissionRepo.find({
      where: { roleId },
      select: ['permissionId'], // Only select the ID for an efficient lookup.
    });
    const existingPermissionIds = new Set(
      existingPermissions.map((rp) => rp.permissionId),
    );

    // 4. Filter out permissions that already exist.
    const permissionsToAssign = permissions.filter(
      (permission) => !existingPermissionIds.has(permission.id),
    );

    // 5. If there are no new permissions to assign, return early.
    if (permissionsToAssign.length === 0) {
      this.logger.log(
        `All provided permissions are already assigned to role ID ${roleId}. No changes made.`,
      );
      return [];
    }

    // 6. Create and save new RolePermission entities for the filtered list.
    const newRolePermissions = permissionsToAssign.map((permission) =>
      this.rolePermissionRepo.create({
        roleId: role.id,
        permissionId: permission.id,
      }),
    );

    // 7. Save only the new, unique permissions.
    return this.rolePermissionRepo.save(newRolePermissions);
  }

  async getPermissionsByRole(roleId: string): Promise<Permission[]> {
    const validRoleId = SecurityUtil.validateId(roleId);

    const role = await this.roleRepo.findOne({
      where: { id: validRoleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role.rolePermissions.map((rp) => rp.permission);
  }

  async removePermission(roleId: string, permissionId: string) {
    const existing = await this.rolePermissionRepo.findOne({
      where: { roleId, permissionId },
    });

    if (!existing) {
      throw new NotFoundException(`Permission not assigned to this role`);
    }

    return this.rolePermissionRepo.remove(existing);
  }
}
