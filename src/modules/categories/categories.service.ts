import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SecurityUtil } from '../../common/utils/security.util';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateCategoryDto, userId?: string): Promise<ServiceResponse<Category>> {
    try {
      SecurityUtil.validateObject(dto);

      const existing = await this.categoryRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A category with this name already exists');
      }

      // Auto-generate slug from name if not provided
      if (!dto.slug) {
        dto.slug = dto.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      const category = this.categoryRepository.create(dto);
      const saved = await this.categoryRepository.save(category);
      if (userId) {
        this.notificationsService.logActivity(userId, 'category_created', saved.id).catch(() => {});
      }
      return { success: true, message: 'Category created successfully', data: saved };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }

  async findAll(query?: { page?: number; limit?: number; includeInactive?: boolean }): Promise<ServiceResponse<Category[]>> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 20;

      const where: any = {};
      if (!query?.includeInactive) {
        where.isActive = true;
      }

      const [categories, total] = await this.categoryRepository.findAndCount({
        where,
        order: { name: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        success: true,
        message: 'Categories retrieved successfully',
        data: categories,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve categories: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<ServiceResponse<Category>> {
    try {
      const category = await this.categoryRepository.findOne({ where: { id } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      return { success: true, message: 'Category retrieved successfully', data: category };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to retrieve category: ${error.message}`);
    }
  }

  async update(id: string, dto: UpdateCategoryDto, userId?: string): Promise<ServiceResponse<Category>> {
    try {
      SecurityUtil.validateObject(dto);

      const category = await this.categoryRepository.findOne({ where: { id } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      if (dto.name && dto.name !== category.name) {
        const existing = await this.categoryRepository.findOne({ where: { name: dto.name } });
        if (existing) throw new ConflictException('A category with this name already exists');
      }

      Object.assign(category, dto);
      const saved = await this.categoryRepository.save(category);
      if (userId) {
        this.notificationsService.logActivity(userId, 'category_updated', id).catch(() => {});
      }
      return { success: true, message: 'Category updated successfully', data: saved };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new Error(`Failed to update category: ${error.message}`);
    }
  }

  async remove(id: string, userId?: string): Promise<ServiceResponse<void>> {
    try {
      const category = await this.categoryRepository.findOne({ where: { id } });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      
      category.isActive = false;
      await this.categoryRepository.save(category);
      if (userId) {
        this.notificationsService.logActivity(userId, 'category_deactivated', id).catch(() => {});
      }
      return { success: true, message: 'Category deactivated successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to deactivate category: ${error.message}`);
    }
  }
}
