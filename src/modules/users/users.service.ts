import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SecurityUtil } from '../../common/utils/security.util';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { R2StorageService } from '../../common/services/r2-storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/security.constants';

const ALLOWED_AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private readonly r2StorageService: R2StorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateUserDto): Promise<ServiceResponse<User>> {
    try {
      SecurityUtil.validateObject(dto);

      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException(
          'A user with this email address already exists',
        );
      }

      let role: Role | undefined;
      if (dto.roleId) {
        const validRoleId = SecurityUtil.validateId(dto.roleId);
        role = await this.roleRepository.findOne({
          where: { id: validRoleId },
        });
        if (!role) {
          throw new NotFoundException('Specified role not found');
        }
      } else {
        // Auto-assign business_owner role for self-registration
        role = await this.roleRepository.findOne({
          where: { name: 'business_owner' },
        });
        if (!role) {
          this.logger.warn('Default business_owner role not found in database. Run seeds first.');
        }
      }

      const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

      const user = this.userRepository.create({
        ...dto,
        passwordHash: hashedPassword,
        role,
      });

      const savedUser = await this.userRepository.save(user);
      return {
        success: true,
        message: 'User created successfully',
        data: savedUser as User,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async findByEmail(
    email: string,
    options?: { includePassword?: boolean },
  ): Promise<User | null> {
    try {
      const queryBuilder = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.email = :email', { email: email.toLowerCase().trim() });

      if (options?.includePassword) {
        queryBuilder.addSelect('user.passwordHash');
      }

      const user = await queryBuilder.getOne();
      return user || null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    try {
      const validUserId = SecurityUtil.validateId(userId);

      const result = await this.userRepository.update(
        { id: validUserId },
        { passwordHash: hashedPassword },
      );

      if (result.affected === 0) {
        throw new NotFoundException('User not found');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async findOneWithPermissions(id: string): Promise<User> {
    try {
      const validId = SecurityUtil.validateId(id);

      // First, get the user with role
      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.id = :id', { id: validId })
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      let allPermissions = [];

      // Use a simpler approach with separate queries to avoid SQL syntax issues
      if (user.role?.id) {
        // Get role permissions
        const rolePermissions = await this.userRepository.manager.query(
          `
          SELECT DISTINCT
            p.id,
            p.name,
            p.description,
            p.resource,
            p.action,
            p.created_at,
            p.updated_at,
            'role' as source
          FROM permissions p
          INNER JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = $1
          ORDER BY p.resource, p.action
          `,
          [user.role.id],
        );

        // Get direct user permissions
        const userPermissions = await this.userRepository.manager.query(
          `
          SELECT DISTINCT
            p.id,
            p.name,
            p.description,
            p.resource,
            p.action,
            p.created_at,
            p.updated_at,
            'direct' as source
          FROM permissions p
          INNER JOIN user_permissions up ON p.id = up.permission_id
          WHERE up.user_id = $1
          ORDER BY p.resource, p.action
          `,
          [validId],
        );

        // Combine and deduplicate permissions (role permissions take precedence for source)
        const permissionMap = new Map();

        // Add role permissions first
        rolePermissions.forEach((perm) => {
          permissionMap.set(perm.id, perm);
        });

        // Add direct permissions (won't overwrite existing role permissions)
        userPermissions.forEach((perm) => {
          if (!permissionMap.has(perm.id)) {
            permissionMap.set(perm.id, perm);
          }
        });

        allPermissions = Array.from(permissionMap.values()).sort((a, b) =>
          `${a.resource}_${a.action}`.localeCompare(
            `${b.resource}_${b.action}`,
          ),
        );
      } else {
        // User has no role - get only direct permissions
        allPermissions = await this.userRepository.manager.query(
          `
          SELECT DISTINCT
            p.id,
            p.name,
            p.description,
            p.resource,
            p.action,
            p.created_at,
            p.updated_at,
            'direct' as source
          FROM permissions p
          INNER JOIN user_permissions up ON p.id = up.permission_id
          WHERE up.user_id = $1
          ORDER BY p.resource, p.action
          `,
          [validId],
        );
      }

      // Assign permissions to user
      user.permissions = allPermissions || [];

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error in findOneWithPermissions:', error);
      throw new Error(`Failed to find user with permissions: ${error.message}`);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const validId = SecurityUtil.validateId(id);

      const user = await this.userRepository.findOne({
        where: { id: validId },
        relations: ['role'],
      });

      return user || null;
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  async getUserPermissions(
    userId: string,
  ): Promise<ServiceResponse<Permission[]>> {
    try {
      const validUserId = SecurityUtil.validateId(userId);

      const user = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('user.id = :id', { id: validUserId })
        .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const allPermissions = new Map<string, Permission>();

      // Fix: Check if user.role exists before accessing its permissions
      if (user.role?.id) {
        // Get role permissions
        const rolePermissions = await this.permissionRepository
          .createQueryBuilder('permission')
          .innerJoin('permission.rolePermissions', 'rp')
          .where('rp.roleId = :roleId', { roleId: user.role.id })
          .getMany();

        rolePermissions.forEach((permission) => {
          allPermissions.set(permission.id, permission);
        });
      }

      // Get direct user permissions
      const userPermissions = await this.permissionRepository
        .createQueryBuilder('permission')
        .innerJoin('permission.userPermissions', 'up')
        .where('up.userId = :userId', { userId: validUserId })
        .getMany();

      userPermissions.forEach((permission) => {
        allPermissions.set(permission.id, permission);
      });

      const permissions = Array.from(allPermissions.values()).sort((a, b) =>
        `${a.resource}_${a.action}`.localeCompare(`${b.resource}_${b.action}`),
      );

      return {
        success: true,
        message: 'User permissions retrieved successfully',
        data: permissions,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve user permissions: ${error.message}`);
    }
  }

  async findAll(): Promise<ServiceResponse<User[]>> {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .select([
          'user.id',
          'user.email',
          'user.name',
          'user.createdAt',
          'user.updatedAt',
          'role.id',
          'role.name',
        ])
        .orderBy('user.createdAt', 'DESC')
        .getMany();

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: users,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve users: ${error.message}`);
    }
  }

  async getProfile(userId: string): Promise<ServiceResponse<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');
    return { success: true, message: 'Profile retrieved', data: user };
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; phone?: string },
  ): Promise<ServiceResponse<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;

    const saved = await this.userRepository.save(user);
    this.notificationsService.logActivity(userId, 'profile_updated', userId).catch(() => {});
    return { success: true, message: 'Profile updated', data: saved };
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ): Promise<ServiceResponse<void>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'passwordHash'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new ConflictException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update({ id: userId }, { passwordHash: hashedPassword });
    this.notificationsService.logActivity(userId, 'password_changed', userId).catch(() => {});
    return { success: true, message: 'Password changed successfully' };
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<ServiceResponse<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.avatarUrl = avatarUrl;
    const saved = await this.userRepository.save(user);
    this.notificationsService.logActivity(userId, 'avatar_updated', userId).catch(() => {});
    return { success: true, message: 'Avatar updated', data: saved };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<ServiceResponse<User>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Validate file type
    if (!ALLOWED_AVATAR_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_AVATAR_MIMES.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_AVATAR_SIZE / (1024 * 1024)}MB`
      );
    }

    // Delete old avatar from R2 if exists
    if (user.avatarUrl) {
      try {
        const oldKey = this.r2StorageService.extractKeyFromUrl(user.avatarUrl);
        await this.r2StorageService.delete(oldKey);
      } catch (error) {
        this.logger.warn(`Failed to delete old avatar: ${error.message}`);
      }
    }

    // Upload new avatar to R2
    const folder = `users/${userId}/avatar`;
    const uploaded = await this.r2StorageService.upload(
      file.buffer,
      folder,
      file.originalname,
      file.mimetype,
    );

    // Update user avatar URL
    user.avatarUrl = uploaded.url;
    const saved = await this.userRepository.save(user);
    this.notificationsService.logActivity(userId, 'avatar_uploaded', userId).catch(() => {});
    
    return { success: true, message: 'Avatar uploaded successfully', data: saved };
  }

  async deleteAccount(userId: string): Promise<ServiceResponse<void>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.userRepository.remove(user);
    this.notificationsService.logActivity(userId, 'account_deleted', userId).catch(() => {});
    return { success: true, message: 'Account deleted' };
  }

  async findOne(id: string): Promise<ServiceResponse<User>> {
    const user = await this.findOneWithPermissions(id);
    return {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string): Promise<ServiceResponse<User>> {
    try {
      const validId = SecurityUtil.validateId(id);
      SecurityUtil.validateObject(dto);

      const user = await this.userRepository.findOne({
        where: { id: validId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (dto.email && dto.email !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: dto.email },
        });
        if (existingUser) {
          throw new ConflictException('Email already exists');
        }
      }

      let role: Role | undefined;
      if (dto.roleId) {
        const validRoleId = SecurityUtil.validateId(dto.roleId);
        role = await this.roleRepository.findOne({
          where: { id: validRoleId },
        });
        if (!role) {
          throw new NotFoundException('Role not found');
        }
      }

      const updateData: any = { ...dto };
      if (dto.password) {
        updateData.passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
      }
      if (role) {
        updateData.role = role;
      }

      await this.userRepository.update(validId, updateData);

      const updatedUser = await this.findOneWithPermissions(validId);
      if (actorId) {
        this.notificationsService.logActivity(actorId, 'user_updated', id).catch(() => {});
      }
      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async remove(id: string, actorId?: string): Promise<ServiceResponse<void>> {
    try {
      const validId = SecurityUtil.validateId(id);

      const user = await this.userRepository.findOne({
        where: { id: validId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Delete avatar from R2 if exists
      if (user.avatarUrl) {
        try {
          const key = this.r2StorageService.extractKeyFromUrl(user.avatarUrl);
          if (key) {
            await this.r2StorageService.delete(key);
          }
        } catch (error) {
          this.logger.warn(`Failed to delete user avatar from R2: ${error.message}`);
        }
      }

      await this.userRepository.remove(user);
      if (actorId) {
        this.notificationsService.logActivity(actorId, 'user_deleted', id).catch(() => {});
      }
      return {
        success: true,
        message: 'User deleted successfully',
        data: undefined,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}
