import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../businesses/entities/business.entity';
import { Category } from '../categories/entities/category.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async search(query: {
    q?: string;
    countryId?: string;
    cityId?: string;
    categoryId?: string;
    serviceType?: string;
    page?: number;
    limit?: number;
    sortBy?: 'relevance' | 'name';
  }): Promise<ServiceResponse<Business[]>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // List/search view: load only the lightweight category relation.
    // Services and branches are detail-view data loaded via findOne — not
    // needed here and cause significant query bloat on paginated results.
    const qb = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.category', 'category')
      .leftJoin('business.services', 'service')
      .leftJoin('business.products', 'product');

    // Only show approved & active businesses with active subscription in public search
    qb.andWhere('business.is_approved = :isApproved', { isApproved: true });
    qb.andWhere('business.is_active = :isActive', { isActive: true });
    qb.andWhere(
      `EXISTS (SELECT 1 FROM subscriptions s WHERE s.business_id = business.id AND s.status = 'active' AND s.end_date > NOW())`,
    );

    // Country filter (from subdomain resolution)
    if (query.countryId) {
      qb.andWhere('business.country_id = :countryId', { countryId: query.countryId });
    }

    // City filter (using FK city_id)
    if (query.cityId) {
      qb.andWhere('business.city_id = :cityId', { cityId: query.cityId });
    }

    // Category filter
    if (query.categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId: query.categoryId });
    }

    // Full-text keyword search across name, description, services, and products (SRS §3.7)
    if (query.q) {
      const keyword = `%${query.q.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(business.name) LIKE :keyword OR LOWER(business.description) LIKE :keyword OR LOWER(service.title) LIKE :keyword OR LOWER(service.description) LIKE :keyword OR LOWER(product.name) LIKE :keyword)',
        { keyword },
      );
    }

    // Product or service type filter (SRS §3.7)
    if (query.serviceType) {
      const typeKeyword = `%${query.serviceType.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(service.title) LIKE :typeKeyword OR LOWER(product.name) LIKE :typeKeyword)',
        { typeKeyword },
      );
    }

    // Sorting
    switch (query.sortBy) {
      case 'name':
        qb.orderBy('business.name', 'ASC');
        break;
      case 'relevance':
      default:
        if (query.q) {
          // Prioritize name matches
          qb.orderBy(
            `CASE WHEN LOWER(business.name) LIKE :exactKeyword THEN 0 ELSE 1 END`,
            'ASC',
          );
          qb.setParameter('exactKeyword', `%${query.q.toLowerCase()}%`);
          qb.addOrderBy('business.name', 'ASC');
        } else {
          qb.orderBy('business.name', 'ASC');
        }
        break;
    }

    const [data, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      message: 'Search results retrieved',
      data,
      meta: { total, page, limit },
    };
  }

  async suggestions(prefix: string): Promise<ServiceResponse<Array<{ name: string; type: string }>>> {
    if (!prefix || prefix.length < 2) {
      return { success: true, message: 'Suggestions retrieved', data: [] };
    }

    const keyword = `${prefix.toLowerCase()}%`;

    // Business name suggestions — only approved, active, subscribed businesses
    const businesses = await this.businessRepository
      .createQueryBuilder('business')
      .select('business.name', 'name')
      .where('LOWER(business.name) LIKE :keyword', { keyword })
      .andWhere('business.is_approved = true')
      .andWhere('business.is_active = true')
      .andWhere(
        `EXISTS (SELECT 1 FROM subscriptions s WHERE s.business_id = business.id AND s.status = 'active' AND s.end_date > NOW())`,
      )
      .limit(5)
      .getRawMany();

    // Category name suggestions
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .select('category.name', 'name')
      .where('LOWER(category.name) LIKE :keyword', { keyword })
      .limit(5)
      .getRawMany();

    const suggestions = [
      ...businesses.map((b) => ({ name: b.name, type: 'business' })),
      ...categories.map((c) => ({ name: c.name, type: 'category' })),
    ];

    return { success: true, message: 'Suggestions retrieved', data: suggestions };
  }
}
