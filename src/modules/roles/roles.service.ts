import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SecurityUtil } from '../../common/utils/security.util';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateRoleDto, userId?: string): Promise<ServiceResponse<Role>> {
    try {
      SecurityUtil.validateObject(dto);

      const existingRole = await this.roleRepository.findOne({
        where: { name: dto.name },
      });

      if (existingRole) {
        throw new ConflictException('Role with this name already exists');
      }

      const role = this.roleRepository.create(dto);
      const savedRole = await this.roleRepository.save(role);

      if (userId) {
        this.notificationsService.logActivity(userId, 'role_created', savedRole.id).catch(() => {});
      }
      return {
        success: true,
        message: 'Role created successfully',
        data: savedRole,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  async findOneWithPermissions(id: string): Promise<Role> {
    const validId = SecurityUtil.validateId(id);

    const role = await this.roleRepository.findOne({
      where: { id: validId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async findAll(query?: { page?: number; limit?: number }): Promise<ServiceResponse<Role[]>> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 20;

      const [roles, total] = await this.roleRepository.findAndCount({
        order: { name: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        success: true,
        message: 'Roles retrieved successfully',
        data: roles,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve roles: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<ServiceResponse<Role>> {
    const role = await this.findOneWithPermissions(id);
    return {
      success: true,
      message: 'Role retrieved successfully',
      data: role,
    };
  }

  async update(id: string, dto: UpdateRoleDto, userId?: string): Promise<ServiceResponse<Role>> {
    try {
      const validId = SecurityUtil.validateId(id);
      SecurityUtil.validateObject(dto);

      const role = await this.roleRepository.findOne({
        where: { id: validId },
      });
      if (!role) {
        throw new NotFoundException('Role not found');
      }

      if (dto.name && dto.name !== role.name) {
        const existingRole = await this.roleRepository.findOne({
          where: { name: dto.name },
        });
        if (existingRole) {
          throw new ConflictException('Role name already exists');
        }
      }

      await this.roleRepository.update(validId, dto);

      const updatedRole = await this.findOneWithPermissions(validId);
      if (userId) {
        this.notificationsService.logActivity(userId, 'role_updated', validId).catch(() => {});
      }
      return {
        success: true,
        message: 'Role updated successfully',
        data: updatedRole,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  async remove(id: string, userId?: string): Promise<ServiceResponse<void>> {
    try {
      const validId = SecurityUtil.validateId(id);

      const role = await this.roleRepository.findOne({
        where: { id: validId },
        relations: ['users'],
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      if (role.users && role.users.length > 0) {
        throw new ConflictException(
          'Cannot delete role that has assigned users',
        );
      }

      await this.roleRepository.remove(role);
      if (userId) {
        this.notificationsService.logActivity(userId, 'role_deleted', id).catch(() => {});
      }
      return {
        success: true,
        message: 'Role deleted successfully',
        data: undefined,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }
}
