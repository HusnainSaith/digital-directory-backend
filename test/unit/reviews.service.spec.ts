import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ReviewsService } from '../../src/modules/reviews/reviews.service';
import { Review } from '../../src/modules/reviews/entities/review.entity';
import { Business } from '../../src/modules/businesses/entities/business.entity';
import { mockRepository } from '../utils/test-helpers';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepo: ReturnType<typeof mockRepository>;
  let businessRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    reviewRepo = mockRepository();
    businessRepo = mockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        { provide: getRepositoryToken(Business), useValue: businessRepo },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── CREATE ────────────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      businessId: 'biz-1',
      rating: 5,
      title: 'Great',
      comment: 'Excellent service',
      reviewerName: 'John',
    };

    it('should throw NotFoundException when business not found', async () => {
      businessRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user already reviewed this business', async () => {
      businessRepo.findOne.mockResolvedValue({ id: 'biz-1' });
      reviewRepo.findOne.mockResolvedValue({ id: 'existing-review' });

      await expect(service.create(createDto as any, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should create review and recalculate rating', async () => {
      businessRepo.findOne.mockResolvedValue({ id: 'biz-1' });
      reviewRepo.findOne.mockResolvedValue(null); // no existing review
      const savedReview = { id: 'rev-1', ...createDto };
      reviewRepo.create.mockReturnValue(savedReview);
      reviewRepo.save.mockResolvedValue(savedReview);

      // Mock recalculateRating query builder
      const ratingQb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '4.5', count: '10' }),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(ratingQb);
      businessRepo.update.mockResolvedValue({});

      const result = await service.create(createDto as any, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(savedReview);
      expect(businessRepo.update).toHaveBeenCalledWith('biz-1', {
        ratingAvg: 4.5,
        ratingCount: 10,
      });
    });

    it('should allow anonymous review (no userId)', async () => {
      businessRepo.findOne.mockResolvedValue({ id: 'biz-1' });
      const savedReview = { id: 'rev-1', ...createDto };
      reviewRepo.create.mockReturnValue(savedReview);
      reviewRepo.save.mockResolvedValue(savedReview);

      const ratingQb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '5', count: '1' }),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(ratingQb);
      businessRepo.update.mockResolvedValue({});

      const result = await service.create(createDto as any);

      expect(result.success).toBe(true);
      // Should skip duplicate check when no userId
      expect(reviewRepo.findOne).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: undefined }) }),
      );
    });
  });

  // ─── FIND ALL ──────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated reviews', async () => {
      const reviews = [{ id: 'rev-1' }, { id: 'rev-2' }];
      reviewRepo.findAndCount.mockResolvedValue([reviews, 2]);

      const result = await service.findAll(undefined, { page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by businessId when provided', async () => {
      reviewRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('biz-1', { page: 1, limit: 10 });

      expect(reviewRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
        }),
      );
    });

    it('should default to page 1 and limit 20', async () => {
      reviewRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll();

      expect(reviewRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  // ─── FIND BY BUSINESS ─────────────────────────────────────────
  describe('findByBusiness', () => {
    it('should return reviews for a specific business', async () => {
      const reviews = [{ id: 'rev-1', businessId: 'biz-1' }];
      reviewRepo.findAndCount.mockResolvedValue([reviews, 1]);

      const result = await service.findByBusiness('biz-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(reviews);
      expect(reviewRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
          relations: ['user'],
        }),
      );
    });
  });

  // ─── FIND ONE ──────────────────────────────────────────────────
  describe('findOne', () => {
    it('should throw NotFoundException when review not found', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should return a review', async () => {
      const review = { id: 'rev-1', rating: 5 };
      reviewRepo.findOne.mockResolvedValue(review);

      const result = await service.findOne('rev-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(review);
    });
  });

  // ─── UPDATE ────────────────────────────────────────────────────
  describe('update', () => {
    it('should throw NotFoundException when review not found', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(service.update('bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should update review and recalculate rating when rating changes', async () => {
      const review = { id: 'rev-1', businessId: 'biz-1', rating: 3 };
      reviewRepo.findOne.mockResolvedValue(review);
      reviewRepo.save.mockResolvedValue({ ...review, rating: 5 });

      const ratingQb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '4.5', count: '10' }),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(ratingQb);
      businessRepo.update.mockResolvedValue({});

      const result = await service.update('rev-1', { rating: 5 } as any);

      expect(result.success).toBe(true);
      expect(businessRepo.update).toHaveBeenCalledWith('biz-1', {
        ratingAvg: 4.5,
        ratingCount: 10,
      });
    });

    it('should skip rating recalculation when rating not changed', async () => {
      const review = { id: 'rev-1', businessId: 'biz-1', rating: 3 };
      reviewRepo.findOne.mockResolvedValue(review);
      reviewRepo.save.mockResolvedValue({ ...review, comment: 'updated' });

      const result = await service.update('rev-1', { comment: 'updated' } as any);

      expect(result.success).toBe(true);
      expect(businessRepo.update).not.toHaveBeenCalled();
    });
  });

  // ─── REMOVE ────────────────────────────────────────────────────
  describe('remove', () => {
    it('should throw NotFoundException when review not found', async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should remove review and recalculate rating', async () => {
      const review = { id: 'rev-1', businessId: 'biz-1' };
      reviewRepo.findOne.mockResolvedValue(review);
      reviewRepo.remove.mockResolvedValue(review);

      const ratingQb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '0', count: '0' }),
      };
      reviewRepo.createQueryBuilder.mockReturnValue(ratingQb);
      businessRepo.update.mockResolvedValue({});

      const result = await service.remove('rev-1');

      expect(result.success).toBe(true);
      expect(reviewRepo.remove).toHaveBeenCalledWith(review);
      expect(businessRepo.update).toHaveBeenCalledWith('biz-1', {
        ratingAvg: 0,
        ratingCount: 0,
      });
    });
  });
});
