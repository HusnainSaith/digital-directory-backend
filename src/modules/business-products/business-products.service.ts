import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessProduct } from '../businesses/entities/business-product.entity';
import { CreateBusinessProductDto } from './dto/create-business-product.dto';
import { UpdateBusinessProductDto } from './dto/update-business-product.dto';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BusinessProductsService {
  constructor(
    @InjectRepository(BusinessProduct)
    private readonly productRepository: Repository<BusinessProduct>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    businessId: string,
    dto: CreateBusinessProductDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessProduct>> {
    const product = this.productRepository.create({ ...dto, businessId });
    const saved = await this.productRepository.save(product);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_product_created', saved.id).catch(() => {});
    }
    return { success: true, message: 'Product created', data: saved };
  }

  async findAll(businessId: string): Promise<ServiceResponse<BusinessProduct[]>> {
    const products = await this.productRepository.find({
      where: { businessId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return { success: true, message: 'Products retrieved', data: products };
  }

  async findOne(id: string, businessId: string): Promise<ServiceResponse<BusinessProduct>> {
    const product = await this.productRepository.findOne({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    return { success: true, message: 'Product retrieved', data: product };
  }

  async update(
    id: string,
    businessId: string,
    dto: UpdateBusinessProductDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessProduct>> {
    const product = await this.productRepository.findOne({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    const saved = await this.productRepository.save(product);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_product_updated', id).catch(() => {});
    }
    return { success: true, message: 'Product updated', data: saved };
  }

  async remove(id: string, businessId: string, userId?: string): Promise<ServiceResponse<void>> {
    const product = await this.productRepository.findOne({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepository.remove(product);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_product_deleted', id).catch(() => {});
    }
    return { success: true, message: 'Product deleted', data: null };
  }
}
