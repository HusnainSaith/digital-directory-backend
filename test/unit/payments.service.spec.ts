import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { Payment } from '../../src/modules/payments/entities/payment.entity';
import { NotFoundException } from '@nestjs/common';
import { mockRepository } from '../utils/test-helpers';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    paymentRepo = mockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('findByUser', () => {
    it('should return paginated payments for a user', async () => {
      const payments = [{ id: 'p1', userId: 'u1' }];
      paymentRepo.findAndCount.mockResolvedValue([payments, 1]);

      const result = await service.findByUser('u1', { page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(payments);
      expect(result.meta.total).toBe(1);
    });

    it('should default to page 1 and limit 20', async () => {
      paymentRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findByUser('u1');

      expect(paymentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a payment', async () => {
      const payment = { id: 'p1', userId: 'u1' };
      paymentRepo.findOne.mockResolvedValue(payment);

      const result = await service.findOne('p1', 'u1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(payment);
    });

    it('should throw NotFoundException when payment not found', async () => {
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('p999', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySubscription', () => {
    it('should return payments for a subscription', async () => {
      const payments = [{ id: 'p1' }, { id: 'p2' }];
      paymentRepo.find.mockResolvedValue(payments);

      const result = await service.findBySubscription('sub-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('findAll (admin)', () => {
    it('should return all payments with default pagination', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.findAll();

      expect(result.success).toBe(true);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should apply country filter when countryId provided', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await service.findAll({ countryId: 'country-1' });

      expect(mockQb.innerJoin).toHaveBeenCalled();
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'business.country_id = :countryId',
        { countryId: 'country-1' },
      );
    });

    it('should apply date range filters', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await service.findAll({ dateFrom: '2025-01-01', dateTo: '2025-12-31' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'payment.created_at >= :dateFrom',
        { dateFrom: '2025-01-01' },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'payment.created_at <= :dateTo',
        { dateTo: '2025-12-31' },
      );
    });
  });
});
