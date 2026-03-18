import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessHour } from '../businesses/entities/business-hour.entity';
import { CreateBusinessHourDto } from './dto/create-business-hour.dto';
import { UpdateBusinessHourDto } from './dto/update-business-hour.dto';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

@Injectable()
export class BusinessHoursService {
  constructor(
    @InjectRepository(BusinessHour)
    private readonly hourRepository: Repository<BusinessHour>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    businessId: string,
    dto: CreateBusinessHourDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessHour>> {
    const hour = this.hourRepository.create({ ...dto, businessId });
    const saved = await this.hourRepository.save(hour);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_hour_created', saved.id).catch(() => {});
    }
    return { success: true, message: 'Business hour created', data: saved };
  }

  async findAll(businessId: string): Promise<ServiceResponse<BusinessHour[]>> {
    const hours = await this.hourRepository.find({ where: { businessId } });
    hours.sort(
      (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
    );
    return { success: true, message: 'Business hours retrieved', data: hours };
  }

  async findOne(
    id: string,
    businessId: string,
  ): Promise<ServiceResponse<BusinessHour>> {
    const hour = await this.hourRepository.findOne({ where: { id, businessId } });
    if (!hour) throw new NotFoundException('Business hour not found');
    return { success: true, message: 'Business hour retrieved', data: hour };
  }

  async update(
    id: string,
    businessId: string,
    dto: UpdateBusinessHourDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessHour>> {
    const hour = await this.hourRepository.findOne({ where: { id, businessId } });
    if (!hour) throw new NotFoundException('Business hour not found');
    Object.assign(hour, dto);
    const saved = await this.hourRepository.save(hour);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_hour_updated', id).catch(() => {});
    }
    return { success: true, message: 'Business hour updated', data: saved };
  }

  async remove(id: string, businessId: string, userId?: string): Promise<ServiceResponse<void>> {
    const hour = await this.hourRepository.findOne({ where: { id, businessId } });
    if (!hour) throw new NotFoundException('Business hour not found');
    await this.hourRepository.remove(hour);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_hour_deleted', id).catch(() => {});
    }
    return { success: true, message: 'Business hour deleted', data: null };
  }
}
