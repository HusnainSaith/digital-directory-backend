import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BusinessesService } from '../../src/modules/businesses/businesses.service';
import { Business } from '../../src/modules/businesses/entities/business.entity';
import { BusinessSocial } from '../../src/modules/businesses/entities/business-social.entity';
import { BusinessHour } from '../../src/modules/businesses/entities/business-hour.entity';
import { BusinessService as BusinessServiceEntity } from '../../src/modules/businesses/entities/business-service.entity';
import { BusinessProduct } from '../../src/modules/businesses/entities/business-product.entity';
import { BusinessBranch } from '../../src/modules/businesses/entities/business-branch.entity';
import { Category } from '../../src/modules/categories/entities/category.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { mockRepository } from '../utils/test-helpers';

describe('BusinessesService', () => {
  let service: BusinessesService;
  let businessRepo: ReturnType<typeof mockRepository>;
  let socialRepo: ReturnType<typeof mockRepository>;
  let businessHourRepo: ReturnType<typeof mockRepository>;
  let serviceRepo: ReturnType<typeof mockRepository>;
  let productRepo: ReturnType<typeof mockRepository>;
  let branchRepo: ReturnType<typeof mockRepository>;
  let categoryRepo: ReturnType<typeof mockRepository>;
  let userRepo: ReturnType<typeof mockRepository>;
  let dataSource: any;
  let notificationsService: Partial<NotificationsService>;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn().mockImplementation((_entity, data) => data),
      save: jest.fn().mockImplementation((_entity, data) => Promise.resolve({ id: 'new-biz-id', ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    businessRepo = mockRepository();
    socialRepo = mockRepository();
    businessHourRepo = mockRepository();
    serviceRepo = mockRepository();
    productRepo = mockRepository();
    branchRepo = mockRepository();
    categoryRepo = mockRepository();
    userRepo = mockRepository();
    notificationsService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      manager: {
        query: jest.fn(),
      },
    };

    // Reset mocks
    Object.values(mockQueryRunner).forEach((fn) => {
      if (typeof fn === 'function') (fn as jest.Mock).mockClear();
    });
    Object.values(mockQueryRunner.manager).forEach((fn) => {
      if (typeof fn === 'function') (fn as jest.Mock).mockClear();
    });
    mockQueryRunner.manager.create.mockImplementation((_entity, data) => data);
    mockQueryRunner.manager.save.mockImplementation((_entity, data) =>
      Promise.resolve({ id: 'new-biz-id', ...data }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(BusinessSocial), useValue: socialRepo },
        { provide: getRepositoryToken(BusinessHour), useValue: businessHourRepo },
        { provide: getRepositoryToken(BusinessServiceEntity), useValue: serviceRepo },
        { provide: getRepositoryToken(BusinessProduct), useValue: productRepo },
        { provide: getRepositoryToken(BusinessBranch), useValue: branchRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: 'Test Business',
      slug: 'test-business',
      shortDescription: 'A test business',
      description: 'Full description',
    };

    it('should throw ConflictException when slug already exists', async () => {
      businessRepo.findOne.mockResolvedValue({ id: 'existing', slug: 'test-business' });

      await expect(service.create(createDto as any)).rejects.toThrow(ConflictException);
    });

    it('should create a business with transaction', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce(null) // slug check → no duplicate
        .mockResolvedValueOnce({ id: 'new-biz-id', name: 'Test Business', categories: [] }); // findOneEntity

      // Admin notification – no admins found
      userRepo.find.mockResolvedValue([]);

      const result = await service.create(createDto as any, 'owner-1');

      expect(result.success).toBe(true);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should resolve categories when categoryIds provided', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'new-biz-id', categories: [{ id: 'cat-1' }] });
      (categoryRepo as any).findBy = jest.fn().mockResolvedValue([{ id: 'cat-1', name: 'Restaurants' }]);
      userRepo.find.mockResolvedValue([]);

      await service.create({ ...createDto, categoryIds: ['cat-1'] } as any, 'owner-1');

      expect((categoryRepo as any).findBy).toHaveBeenCalled();
    });

    it('should save child entities (socials, hours, images, services, products, branches)', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'new-biz-id', categories: [] });
      userRepo.find.mockResolvedValue([]);

      const dtoWithChildren = {
        ...createDto,
        socials: [{ platform: 'twitter', url: 'https://twitter.com/test' }],
        businessHours: [{ day: 'Monday', open: '09:00', close: '17:00' }],
        services: [{ name: 'Consulting' }],
        products: [{ name: 'Widget' }],
        branches: [{ name: 'Main Branch' }],
      };

      await service.create(dtoWithChildren as any, 'owner-1');

      // save is called for: business + 5 child entity types = 6 calls
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(6);
    });

    it('should rollback transaction on failure', async () => {
      businessRepo.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.create(createDto as any)).rejects.toThrow('Failed to create business');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  // ─── FIND ALL ──────────────────────────────────────────────────
  describe('findAll', () => {
    const mockQb = (): any => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    });

    it('should return paginated businesses', async () => {
      const qb = mockQb();
      qb.getManyAndCount.mockResolvedValue([[{ id: '1' }], 1]);
      businessRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should apply public visibility gate by default', async () => {
      const qb = mockQb();
      businessRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({});

      // 3 calls: is_approved, is_active, subscription EXISTS
      expect(qb.andWhere).toHaveBeenCalledWith('business.is_approved = true');
      expect(qb.andWhere).toHaveBeenCalledWith('business.is_active = true');
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS'),
      );
    });

    it('should skip visibility gate when publicView is false', async () => {
      const qb = mockQb();
      businessRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ publicView: false });

      expect(qb.andWhere).not.toHaveBeenCalledWith('business.is_approved = true');
    });

    it('should apply category filter', async () => {
      const qb = mockQb();
      businessRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ category: 'restaurants' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'category.slug = :categorySlug',
        { categorySlug: 'restaurants' },
      );
    });

    it('should apply city filter by city_id FK', async () => {
      const qb = mockQb();
      businessRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ city: 'some-city-uuid' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'business.city_id = :cityId',
        { cityId: 'some-city-uuid' },
      );
    });

    it('should apply search filter across name, description, short_description', async () => {
      const qb = mockQb();
      businessRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'pizza' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('business.name ILIKE :search'),
        { search: '%pizza%' },
      );
    });

    it('should apply search filter', async () => {
      const qb = mockQb();
      businessRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'test' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('business.name ILIKE :search'),
        { search: '%test%' },
      );
    });

    it('should default to page 1 and limit 20', async () => {
      const qb = mockQb();
      businessRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll();

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  // ─── FIND ONE ──────────────────────────────────────────────────
  describe('findOne', () => {
    it('should throw NotFoundException when business not found', async () => {
      businessRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should return business when requester is the owner (skip visibility)', async () => {
      const business = { id: 'biz-1', ownerId: 'owner-1', isApproved: false, isActive: false };
      businessRepo.findOne.mockResolvedValue(business);

      const result = await service.findOne('biz-1', 'owner-1');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('biz-1');
    });

    it('should throw NotFoundException for non-owner when business is not approved', async () => {
      const business = { id: 'biz-1', ownerId: 'owner-1', isApproved: false, isActive: true };
      businessRepo.findOne.mockResolvedValue(business);

      await expect(service.findOne('biz-1', 'other-user')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-owner when business is not active', async () => {
      const business = { id: 'biz-1', ownerId: 'owner-1', isApproved: true, isActive: false };
      businessRepo.findOne.mockResolvedValue(business);

      await expect(service.findOne('biz-1', 'other-user')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-owner when business has no active subscription', async () => {
      const business = { id: 'biz-1', ownerId: 'owner-1', isApproved: true, isActive: true };
      businessRepo.findOne.mockResolvedValue(business);
      dataSource.manager.query.mockResolvedValue([]); // no subscription

      await expect(service.findOne('biz-1', 'other-user')).rejects.toThrow(NotFoundException);
    });

    it('should return business for non-owner when business has active subscription', async () => {
      const business = { id: 'biz-1', ownerId: 'owner-1', isApproved: true, isActive: true };
      businessRepo.findOne.mockResolvedValue(business);
      dataSource.manager.query.mockResolvedValue([{ '?column?': 1 }]); // has subscription

      const result = await service.findOne('biz-1', 'other-user');

      expect(result.success).toBe(true);
    });
  });

  // ─── FIND ONE ─────────────────────────────────────────────────
  describe('findOne', () => {
    it('should throw NotFoundException when business not found', async () => {
      businessRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────
  describe('update', () => {
    it('should throw NotFoundException when business not found', async () => {
      businessRepo.findOne.mockResolvedValue(null);

      await expect(service.update('bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new slug already exists', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce({ id: 'biz-1', slug: 'old-slug', categories: [] }) // current
        .mockResolvedValueOnce({ id: 'biz-2', slug: 'taken-slug' }); // slug check

      await expect(
        service.update('biz-1', { slug: 'taken-slug' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should update flat fields and commit transaction', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce({ id: 'biz-1', slug: 'my-biz', categories: [], name: 'Old Name' }) // current
        .mockResolvedValueOnce({ id: 'biz-1', slug: 'my-biz', categories: [], name: 'New Name' }); // findOneEntity

      const result = await service.update('biz-1', { name: 'New Name' } as any);

      expect(result.success).toBe(true);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should replace child entities when provided', async () => {
      businessRepo.findOne
        .mockResolvedValueOnce({ id: 'biz-1', slug: 'my-biz', categories: [] })
        .mockResolvedValueOnce({ id: 'biz-1', slug: 'my-biz', categories: [] });

      await service.update('biz-1', {
        socials: [{ platform: 'instagram', url: 'https://ig.com/test' }],
      } as any);

      // delete old socials, then save new ones
      expect(mockQueryRunner.manager.delete).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      businessRepo.findOne.mockResolvedValueOnce({
        id: 'biz-1',
        slug: 'my-biz',
        categories: [],
      });
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB fail'));

      await expect(service.update('biz-1', { name: 'X' } as any)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ─── REMOVE ────────────────────────────────────────────────────
  describe('remove', () => {
    it('should throw NotFoundException when business not found', async () => {
      businessRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should remove the business', async () => {
      const business = { id: 'biz-1' };
      businessRepo.findOne.mockResolvedValue(business);
      businessRepo.remove.mockResolvedValue(business);

      const result = await service.remove('biz-1');

      expect(result.success).toBe(true);
      expect(businessRepo.remove).toHaveBeenCalledWith(business);
    });
  });

  // ─── FIND BY USER ─────────────────────────────────────────────
  describe('findByUser', () => {
    it('should return paginated businesses for a user', async () => {
      const bizList = [{ id: 'biz-1', userId: 'owner-1' }];
      businessRepo.findAndCount.mockResolvedValue([bizList, 1]);

      const result = await service.findByUser('owner-1', { page: 1, limit: 5 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(bizList);
      expect(result.meta.total).toBe(1);
    });

    it('should default to page 1 and limit 20', async () => {
      businessRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findByUser('owner-1');

      expect(businessRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  // ─── TOGGLE ACTIVE ────────────────────────────────────────────
  describe('toggleActive', () => {
    it('should throw NotFoundException when business not found or not owner', async () => {
      businessRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleActive('biz-1', 'owner-1', true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should activate business', async () => {
      const business = { id: 'biz-1', ownerId: 'owner-1', isActive: false };
      businessRepo.findOne.mockResolvedValue(business);
      businessRepo.save.mockResolvedValue({ ...business, isActive: true });

      const result = await service.toggleActive('biz-1', 'owner-1', true);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Business activated');
      expect(business.isActive).toBe(true);
    });

    it('should deactivate business', async () => {
      const business = { id: 'biz-1', ownerId: 'owner-1', isActive: true };
      businessRepo.findOne.mockResolvedValue(business);
      businessRepo.save.mockResolvedValue({ ...business, isActive: false });

      const result = await service.toggleActive('biz-1', 'owner-1', false);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Business deactivated');
    });
  });
});
