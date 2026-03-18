import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async findByUser(
    userId: string,
    query?: { page?: number; limit?: number },
  ): Promise<ServiceResponse<Payment[]>> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.subscription', 'subscription')
      .innerJoin('subscription.business', 'business')
      .where('business.user_id = :userId', { userId })
      .orderBy('payment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      success: true,
      message: 'Payment history retrieved',
      data,
      meta: { total, page, limit },
    };
  }

  async findOne(id: string, userId: string): Promise<ServiceResponse<Payment>> {
    const payment = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.subscription', 'subscription')
      .innerJoin('subscription.business', 'business')
      .where('payment.id = :id', { id })
      .andWhere('business.user_id = :userId', { userId })
      .getOne();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      success: true,
      message: 'Payment retrieved',
      data: payment,
    };
  }

  async findBySubscription(
    subscriptionId: string,
  ): Promise<ServiceResponse<Payment[]>> {
    const data = await this.paymentRepository.find({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      message: 'Subscription payments retrieved',
      data,
    };
  }

  /** Admin: list all payments with pagination */
  async findAll(query?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    countryId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ServiceResponse<Payment[]>> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.subscription', 'subscription')
      .leftJoin('subscription.business', 'business');

    if (query?.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }
    if (query?.userId) {
      qb.andWhere('business.user_id = :userId', { userId: query.userId });
    }
    if (query?.countryId) {
      qb.andWhere('business.country_id = :countryId', { countryId: query.countryId });
    }
    if (query?.dateFrom) {
      qb.andWhere('payment.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query?.dateTo) {
      qb.andWhere('payment.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('payment.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      success: true,
      message: 'Payments retrieved',
      data,
      meta: { total, page, limit },
    };
  }
}
