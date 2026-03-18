import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from '../../src/modules/users/users.service';
import { User } from '../../src/modules/users/entities/user.entity';
import { Role } from '../../src/modules/roles/entities/role.entity';
import { Permission } from '../../src/modules/permissions/entities/permission.entity';
import { mockRepository } from '../utils/test-helpers';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof mockRepository>;
  let roleRepo: ReturnType<typeof mockRepository>;
  let permissionRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    userRepo = mockRepository();
    roleRepo = mockRepository();
    permissionRepo = mockRepository();

    // Add manager mock for raw queries in findOneWithPermissions
    (userRepo as any).manager = {
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(Permission), useValue: permissionRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      email: 'new@test.com',
      password: 'Password123!',
      fullName: 'New User',
    };

    it('should throw ConflictException when email already exists', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing', email: 'new@test.com' });

      await expect(service.create(createDto as any)).rejects.toThrow(ConflictException);
    });

    it('should create user with hashed password', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const savedUser = { id: '33333333-3333-4333-a333-333333333333', ...createDto, password: '$2a$12$hashedPassword' };
      userRepo.create.mockReturnValue(savedUser);
      userRepo.save.mockResolvedValue(savedUser);

      const result = await service.create(createDto as any);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('33333333-3333-4333-a333-333333333333');
    });

    it('should assign role when roleId provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const role = { id: '55555555-5555-4555-a555-555555555555', name: 'visitor' };
      roleRepo.findOne.mockResolvedValue(role);
      const savedUser = { id: '33333333-3333-4333-a333-333333333333', ...createDto, role };
      userRepo.create.mockReturnValue(savedUser);
      userRepo.save.mockResolvedValue(savedUser);

      const result = await service.create({ ...createDto, roleId: '55555555-5555-4555-a555-555555555555' } as any);

      expect(result.success).toBe(true);
      expect(roleRepo.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException when roleId is invalid', async () => {
      userRepo.findOne.mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...createDto, roleId: '66666666-6666-4666-a666-666666666666' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FIND BY EMAIL ─────────────────────────────────────────────
  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: '33333333-3333-4333-a333-333333333333', email: 'test@test.com' }),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findByEmail('test@test.com');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@test.com');
    });

    it('should return null when user not found', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findByEmail('nobody@test.com');

      expect(result).toBeNull();
    });

    it('should include password when option is set', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: '33333333-3333-4333-a333-333333333333' }),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findByEmail('test@test.com', { includePassword: true });

      expect(mockQb.addSelect).toHaveBeenCalledWith('user.password');
    });
  });

  // ─── UPDATE PASSWORD ──────────────────────────────────────────
  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      userRepo.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.updatePassword('11111111-1111-4111-a111-111111111111', 'newHashedPwd'),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.update.mockResolvedValue({ affected: 0 });

      await expect(
        service.updatePassword('11111111-1111-4111-a111-111111111111', 'hash'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FIND ONE WITH PERMISSIONS ─────────────────────────────────
  describe('findOneWithPermissions', () => {
    it('should throw NotFoundException when user not found', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.findOneWithPermissions('11111111-1111-4111-a111-111111111111'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return user with combined role and direct permissions', async () => {
      const mockUser = {
        id: '11111111-1111-4111-a111-111111111111',
        email: 'test@test.com',
        role: { id: '55555555-5555-4555-a555-555555555555', name: 'admin' },
      };
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQb);

      const rolePerms = [
        { id: '77777777-7777-4777-a777-777777777771', name: 'Read Users', resource: 'users', action: 'read', source: 'role' },
      ];
      const userPerms = [
        { id: '77777777-7777-4777-a777-777777777772', name: 'Write Settings', resource: 'settings', action: 'write', source: 'direct' },
      ];
      (userRepo as any).manager.query
        .mockResolvedValueOnce(rolePerms) // role permissions query
        .mockResolvedValueOnce(userPerms); // direct permissions query

      const result = await service.findOneWithPermissions('11111111-1111-4111-a111-111111111111');

      expect(result.permissions).toHaveLength(2);
      expect(result.permissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: '77777777-7777-4777-a777-777777777771' }),
          expect.objectContaining({ id: '77777777-7777-4777-a777-777777777772' }),
        ]),
      );
    });
  });

  // ─── FIND BY ID ───────────────────────────────────────────────
  describe('findById', () => {
    it('should return user with role relation', async () => {
      const user = { id: '33333333-3333-4333-a333-333333333333', email: 'test@test.com', role: { name: 'visitor' } };
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.findById('11111111-1111-4111-a111-111111111111');

      expect(result).toEqual(user);
    });

    it('should return null when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.findById('11111111-1111-4111-a111-111111111111');

      expect(result).toBeNull();
    });
  });

  // ─── GET USER PERMISSIONS ──────────────────────────────────────
  describe('getUserPermissions', () => {
    it('should throw NotFoundException when user not found', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQb);

      await expect(
        service.getUserPermissions('11111111-1111-4111-a111-111111111111'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should combine role and direct permissions', async () => {
      const mockUser = { id: '33333333-3333-4333-a333-333333333333', role: { id: '55555555-5555-4555-a555-555555555555' } };
      const userQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepo.createQueryBuilder.mockReturnValue(userQb);

      const rolePerm = { id: '77777777-7777-4777-a777-777777777771', resource: 'users', action: 'read' };
      const directPerm = { id: '77777777-7777-4777-a777-777777777772', resource: 'settings', action: 'write' };
      const rolePermQb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([rolePerm]),
      };
      const directPermQb: any = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([directPerm]),
      };
      permissionRepo.createQueryBuilder
        .mockReturnValueOnce(rolePermQb)
        .mockReturnValueOnce(directPermQb);

      const result = await service.getUserPermissions('11111111-1111-4111-a111-111111111111');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  // ─── FIND ALL ──────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return all users', async () => {
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  // ─── PROFILE ──────────────────────────────────────────────────
  describe('getProfile', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('22222222-2222-4222-a222-222222222222')).rejects.toThrow(NotFoundException);
    });

    it('should return user profile', async () => {
      const user = { id: '33333333-3333-4333-a333-333333333333', email: 'test@test.com' };
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.getProfile('33333333-3333-4333-a333-333333333333');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(user);
    });
  });

  describe('updateProfile', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('22222222-2222-4222-a222-222222222222', {})).rejects.toThrow(NotFoundException);
    });

    it('should update name and phone', async () => {
      const user = { id: '33333333-3333-4333-a333-333333333333', name: 'Old', phone: null };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, name: 'New Name', phone: '+1234' });

      const result = await service.updateProfile('33333333-3333-4333-a333-333333333333', {
        name: 'New Name',
        phone: '+1234',
      });

      expect(result.success).toBe(true);
      expect(user.name).toBe('New Name');
      expect(user.phone).toBe('+1234');
    });
  });

  describe('updateAvatar', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.updateAvatar('22222222-2222-4222-a222-222222222222', 'url')).rejects.toThrow(NotFoundException);
    });

    it('should update avatar URL', async () => {
      const user = { id: '33333333-3333-4333-a333-333333333333', avatarUrl: null };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, avatarUrl: 'https://img.com/avatar.jpg' });

      const result = await service.updateAvatar('33333333-3333-4333-a333-333333333333', 'https://img.com/avatar.jpg');

      expect(result.success).toBe(true);
      expect(user.avatarUrl).toBe('https://img.com/avatar.jpg');
    });
  });

  // ─── DELETE ACCOUNT ────────────────────────────────────────────
  describe('deleteAccount', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteAccount('22222222-2222-4222-a222-222222222222')).rejects.toThrow(NotFoundException);
    });

    it('should delete user account', async () => {
      const user = { id: '33333333-3333-4333-a333-333333333333' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.remove.mockResolvedValue(user);

      const result = await service.deleteAccount('33333333-3333-4333-a333-333333333333');

      expect(result.success).toBe(true);
      expect(userRepo.remove).toHaveBeenCalledWith(user);
    });
  });

  // ─── UPDATE (admin) ───────────────────────────────────────────
  describe('update', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('11111111-1111-4111-a111-111111111111', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new email already taken', async () => {
      userRepo.findOne
        .mockResolvedValueOnce({ id: '33333333-3333-4333-a333-333333333333', email: 'old@test.com' }) // find current
        .mockResolvedValueOnce({ id: '44444444-4444-4444-a444-444444444444', email: 'taken@test.com' }); // duplicate check

      await expect(
        service.update('11111111-1111-4111-a111-111111111111', { email: 'taken@test.com' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password when provided', async () => {
      const user = { id: '33333333-3333-4333-a333-333333333333', email: 'test@test.com' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.update.mockResolvedValue({});

      // Mock findOneWithPermissions for the return
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...user, role: null, permissions: [] }),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQb);
      (userRepo as any).manager.query.mockResolvedValue([]);

      await service.update('11111111-1111-4111-a111-111111111111', { password: 'NewPass!' } as any);

      expect(userRepo.update).toHaveBeenCalledWith(
        '11111111-1111-4111-a111-111111111111',
        expect.objectContaining({ password: '$2a$12$hashedPassword' }),
      );
    });
  });

  // ─── REMOVE ────────────────────────────────────────────────────
  describe('remove', () => {
    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('11111111-1111-4111-a111-111111111111'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove user', async () => {
      const user = { id: '33333333-3333-4333-a333-333333333333' };
      userRepo.findOne.mockResolvedValue(user);
      userRepo.remove.mockResolvedValue(user);

      const result = await service.remove('11111111-1111-4111-a111-111111111111');

      expect(result.success).toBe(true);
      expect(userRepo.remove).toHaveBeenCalledWith(user);
    });
  });
});

