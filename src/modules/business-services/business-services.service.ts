import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessService as BusinessServiceEntity } from '../businesses/entities/business-service.entity';
import { CreateBusinessServiceDto } from './dto/create-business-service.dto';
import { UpdateBusinessServiceDto } from './dto/update-business-service.dto';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BusinessServicesService {
  constructor(
    @InjectRepository(BusinessServiceEntity)
    private readonly serviceRepository: Repository<BusinessServiceEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    businessId: string,
    dto: CreateBusinessServiceDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessServiceEntity>> {
    const service = this.serviceRepository.create({ ...dto, businessId });
    const saved = await this.serviceRepository.save(service);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_service_created', saved.id).catch(() => {});
    }
    return { success: true, message: 'Service created', data: saved };
  }

  async findAll(businessId: string): Promise<ServiceResponse<BusinessServiceEntity[]>> {
    const services = await this.serviceRepository.find({
      where: { businessId },
      order: { createdAt: 'ASC' },
    });
    return { success: true, message: 'Services retrieved', data: services };
  }

  async findOne(id: string, businessId: string): Promise<ServiceResponse<BusinessServiceEntity>> {
    const service = await this.serviceRepository.findOne({ where: { id, businessId } });
    if (!service) throw new NotFoundException('Service not found');
    return { success: true, message: 'Service retrieved', data: service };
  }

  async update(
    id: string,
    businessId: string,
    dto: UpdateBusinessServiceDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessServiceEntity>> {
    const service = await this.serviceRepository.findOne({ where: { id, businessId } });
    if (!service) throw new NotFoundException('Service not found');
    Object.assign(service, dto);
    const saved = await this.serviceRepository.save(service);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_service_updated', id).catch(() => {});
    }
    return { success: true, message: 'Service updated', data: saved };
  }

  async remove(id: string, businessId: string, userId?: string): Promise<ServiceResponse<void>> {
    const service = await this.serviceRepository.findOne({ where: { id, businessId } });
    if (!service) throw new NotFoundException('Service not found');
    await this.serviceRepository.remove(service);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_service_deleted', id).catch(() => {});
    }
    return { success: true, message: 'Service deleted', data: null };
  }
}
