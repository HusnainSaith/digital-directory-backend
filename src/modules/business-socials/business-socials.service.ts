import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessSocial } from '../businesses/entities/business-social.entity';
import { CreateBusinessSocialDto } from './dto/create-business-social.dto';
import { UpdateBusinessSocialDto } from './dto/update-business-social.dto';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BusinessSocialsService {
  constructor(
    @InjectRepository(BusinessSocial)
    private readonly socialRepository: Repository<BusinessSocial>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    businessId: string,
    dto: CreateBusinessSocialDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessSocial>> {
    const social = this.socialRepository.create({ ...dto, businessId });
    const saved = await this.socialRepository.save(social);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_social_created', saved.id).catch(() => {});
    }
    return { success: true, message: 'Social link created', data: saved };
  }

  async findAll(businessId: string): Promise<ServiceResponse<BusinessSocial[]>> {
    const socials = await this.socialRepository.find({
      where: { businessId },
      order: { createdAt: 'ASC' },
    });
    return { success: true, message: 'Social links retrieved', data: socials };
  }

  async findOne(id: string, businessId: string): Promise<ServiceResponse<BusinessSocial>> {
    const social = await this.socialRepository.findOne({ where: { id, businessId } });
    if (!social) throw new NotFoundException('Social link not found');
    return { success: true, message: 'Social link retrieved', data: social };
  }

  async update(
    id: string,
    businessId: string,
    dto: UpdateBusinessSocialDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessSocial>> {
    const social = await this.socialRepository.findOne({ where: { id, businessId } });
    if (!social) throw new NotFoundException('Social link not found');
    Object.assign(social, dto);
    const saved = await this.socialRepository.save(social);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_social_updated', id).catch(() => {});
    }
    return { success: true, message: 'Social link updated', data: saved };
  }

  async remove(id: string, businessId: string, userId?: string): Promise<ServiceResponse<void>> {
    const social = await this.socialRepository.findOne({ where: { id, businessId } });
    if (!social) throw new NotFoundException('Social link not found');
    await this.socialRepository.remove(social);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_social_deleted', id).catch(() => {});
    }
    return { success: true, message: 'Social link deleted', data: null };
  }
}
