import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { SecurityUtil } from '../../common/utils/security.util';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateReviewDto, userId?: string): Promise<ServiceResponse<Review>> {
    try {
      SecurityUtil.validateObject(dto);

      // Prevent duplicate reviews from same user for same business
      if (userId) {
        const existing = await this.reviewRepository.findOne({
          where: { businessId: dto.businessId, userId },
        });
        if (existing) {
          throw new ConflictException('You have already reviewed this business');
        }
      }

      const review = this.reviewRepository.create({
        ...dto,
        userId: userId || undefined,
      });
      const saved = await this.reviewRepository.save(review);
      if (userId) {
        this.notificationsService.logActivity(userId, 'review_created', saved.id).catch(() => {});
      }

      return { success: true, message: 'Review created successfully', data: saved };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new Error(`Failed to create review: ${error.message}`);
    }
  }

  async findAll(
    businessId?: string,
    query?: { page?: number; limit?: number },
  ): Promise<ServiceResponse<Review[]>> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 20;
      const where = businessId ? { businessId } : {};

      const [data, total] = await this.reviewRepository.findAndCount({
        where,
        relations: ['user', 'business'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        success: true,
        message: 'Reviews retrieved successfully',
        data,
        meta: { total, page, limit },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve reviews: ${error.message}`);
    }
  }

  async findByBusiness(
    businessId: string,
    query?: { page?: number; limit?: number },
  ): Promise<ServiceResponse<Review[]>> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 20;

      const [data, total] = await this.reviewRepository.findAndCount({
        where: { businessId },
        relations: ['user'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        success: true,
        message: 'Reviews retrieved successfully',
        data,
        meta: { total, page, limit },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve reviews: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<ServiceResponse<Review>> {
    try {
      const review = await this.reviewRepository.findOne({ where: { id } });
      if (!review) throw new NotFoundException('Review not found');
      return { success: true, message: 'Review retrieved successfully', data: review };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to retrieve review: ${error.message}`);
    }
  }

  async update(id: string, dto: UpdateReviewDto, userId?: string): Promise<ServiceResponse<Review>> {
    try {
      SecurityUtil.validateObject(dto);

      const review = await this.reviewRepository.findOne({ where: { id } });
      if (!review) throw new NotFoundException('Review not found');

      Object.assign(review, dto);
      const saved = await this.reviewRepository.save(review);
      if (userId) {
        this.notificationsService.logActivity(userId, 'review_updated', id).catch(() => {});
      }

      return { success: true, message: 'Review updated successfully', data: saved };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to update review: ${error.message}`);
    }
  }

  async remove(id: string, userId?: string): Promise<ServiceResponse<void>> {
    try {
      const review = await this.reviewRepository.findOne({ where: { id } });
      if (!review) throw new NotFoundException('Review not found');

      await this.reviewRepository.remove(review);
      if (userId) {
        this.notificationsService.logActivity(userId, 'review_deleted', id).catch(() => {});
      }

      return { success: true, message: 'Review deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to delete review: ${error.message}`);
    }
  }
}
