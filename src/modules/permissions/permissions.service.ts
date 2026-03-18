import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { SecurityUtil } from '../../common/utils/security.util';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(dto: CreatePermissionDto): Promise<ServiceResponse<Permission>> {
    try {
      SecurityUtil.validateObject(dto);

      const existingPermission = await this.permissionRepository.findOne({
        where: { name: dto.name },
      });

      if (existingPermission) {
        throw new ConflictException('Permission with this name already exists');
      }

      const permission = this.permissionRepository.create(dto);
      const savedPermission = await this.permissionRepository.save(permission);

      return {
        success: true,
        message: 'Permission created successfully',
        data: savedPermission,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Failed to create permission: ${error.message}`);
    }
  }

  async findAll(query?: { page?: number; limit?: number }): Promise<ServiceResponse<Permission[]>> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 20;

      const [permissions, total] = await this.permissionRepository.findAndCount({
        order: { resource: 'ASC', action: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        success: true,
        message: 'Permissions retrieved successfully',
        data: permissions,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve permissions: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<ServiceResponse<Permission>> {
    try {
      const validId = SecurityUtil.validateId(id);

      const permission = await this.permissionRepository.findOne({
        where: { id: validId },
      });

      if (!permission) {
        throw new NotFoundException('Permission not found');
      }

      return {
        success: true,
        message: 'Permission retrieved successfully',
        data: permission,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve permission: ${error.message}`);
    }
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<ServiceResponse<Permission>> {
    try {
      const validId = SecurityUtil.validateId(id);
      SecurityUtil.validateObject(dto);

      const permission = await this.permissionRepository.findOne({
        where: { id: validId },
      });

      if (!permission) {
        throw new NotFoundException('Permission not found');
      }

      if (dto.name && dto.name !== permission.name) {
        const existingPermission = await this.permissionRepository.findOne({
          where: { name: dto.name },
        });
        if (existingPermission) {
          throw new ConflictException('Permission name already exists');
        }
      }

      await this.permissionRepository.update(validId, dto);

      const updatedPermission = await this.permissionRepository.findOne({
        where: { id: validId },
      });

      return {
        success: true,
        message: 'Permission updated successfully',
        data: updatedPermission,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update permission: ${error.message}`);
    }
  }

  async remove(id: string): Promise<ServiceResponse<void>> {
    try {
      const validId = SecurityUtil.validateId(id);

      const permission = await this.permissionRepository.findOne({
        where: { id: validId },
      });

      if (!permission) {
        throw new NotFoundException('Permission not found');
      }

      await this.permissionRepository.remove(permission);

      return {
        success: true,
        message: 'Permission deleted successfully',
        data: undefined,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete permission: ${error.message}`);
    }
  }
}
