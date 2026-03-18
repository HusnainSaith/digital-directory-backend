import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchService } from '../../src/modules/search/search.service';
import { Business } from '../../src/modules/businesses/entities/business.entity';
import { Category } from '../../src/modules/categories/entities/category.entity';
import { Subscription } from '../../src/modules/subscriptions/entities/subscription.entity';

describe('SearchService', () => {
  let service: SearchService;
  let businessRepo: any;
  let categoryRepo: any;

  const createMockQb = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    businessRepo = { createQueryBuilder: jest.fn().mockReturnValue(createMockQb()) };
    categoryRepo = { createQueryBuilder: jest.fn().mockReturnValue(createMockQb()) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(Subscription), useValue: {} },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  describe('search', () => {
    it('should return search results with pagination', async () => {
      const mockQb = createMockQb();
      mockQb.getManyAndCount.mockResolvedValue([[{ id: '1', name: 'Test' }], 1]);
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.search({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should enforce max limit of 50', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({ limit: 100 });

      expect(mockQb.take).toHaveBeenCalledWith(50);
    });

    it('should enforce minimum page of 1', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({ page: -1 });

      expect(mockQb.skip).toHaveBeenCalledWith(0);
    });

    it('should apply keyword search filter', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({ q: 'restaurant' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(business.name) LIKE'),
        expect.objectContaining({ keyword: '%restaurant%' }),
      );
    });

    it('should apply country filter', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({ countryId: 'country-1' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'business.country_id = :countryId',
        { countryId: 'country-1' },
      );
    });

    it('should apply city filter', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({ cityId: 'city-1' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'business.city_id = :cityId',
        { cityId: 'city-1' },
      );
    });

    it('should sort by name when sortBy is name', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({ sortBy: 'name' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('business.name', 'ASC');
    });

    it('should sort by relevance when specified', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({ sortBy: 'relevance' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('business.created_at', 'DESC');
    });

    it('should sort by name when specified', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({ sortBy: 'name' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('business.name', 'ASC');
    });

    it('should always enforce visibility filters', async () => {
      const mockQb = createMockQb();
      businessRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.search({});

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'business.verified = :verified',
        { verified: true },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'business.is_approved = :isApproved',
        { isApproved: true },
      );
    });
  });

  describe('suggestions', () => {
    it('should return empty array for short prefix', async () => {
      const result = await service.suggestions('a');

      expect(result.data).toEqual([]);
    });

    it('should return business and category suggestions', async () => {
      const bizQb = createMockQb();
      bizQb.getRawMany.mockResolvedValue([{ name: 'Restaurant Foo' }]);
      businessRepo.createQueryBuilder.mockReturnValue(bizQb);

      const catQb = createMockQb();
      catQb.getRawMany.mockResolvedValue([{ name: 'Restaurants' }]);
      categoryRepo.createQueryBuilder.mockReturnValue(catQb);

      const result = await service.suggestions('rest');

      expect(result.data).toEqual([
        { name: 'Restaurant Foo', type: 'business' },
        { name: 'Restaurants', type: 'category' },
      ]);
    });
  });
});
