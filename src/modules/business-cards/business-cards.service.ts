import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessCard, CardFileType } from './entities/business-card.entity';
import { R2StorageService } from '../../common/services/r2-storage.service';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BusinessCardsService {
  constructor(
    @InjectRepository(BusinessCard)
    private readonly businessCardRepository: Repository<BusinessCard>,
    private readonly r2StorageService: R2StorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async upload(
    businessId: string,
    file: Express.Multer.File,
    userId?: string,
  ): Promise<ServiceResponse<BusinessCard>> {
    // Check if card already exists
    const existing = await this.businessCardRepository.findOne({
      where: { businessId },
    });
    if (existing) {
      throw new ConflictException('Business card already exists. Use PUT to replace.');
    }

    const folder = `businesses/${businessId}/card`;
    const isPdf = file.mimetype === 'application/pdf';
    const uploaded = await this.r2StorageService.upload(
      file.buffer,
      folder,
      file.originalname,
      file.mimetype,
    );

    const card = this.businessCardRepository.create({
      businessId,
      cardUrl: uploaded.url,
      fileType: isPdf ? CardFileType.PDF : CardFileType.IMAGE,
    });

    const saved = await this.businessCardRepository.save(card);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_card_uploaded', saved.id).catch(() => {});
    }
    return { success: true, message: 'Business card uploaded', data: saved };
  }

  async findOne(businessId: string): Promise<ServiceResponse<BusinessCard>> {
    const card = await this.businessCardRepository.findOne({
      where: { businessId },
    });
    if (!card) {
      throw new NotFoundException('Business card not found');
    }
    return { success: true, message: 'Business card retrieved', data: card };
  }

  async replace(
    businessId: string,
    file: Express.Multer.File,
    userId?: string,
  ): Promise<ServiceResponse<BusinessCard>> {
    let card = await this.businessCardRepository.findOne({
      where: { businessId },
    });

    // Delete old file from R2
    if (card && card.cardUrl) {
      const key = this.r2StorageService.extractKeyFromUrl(card.cardUrl);
      await this.r2StorageService.delete(key).catch(() => {});
    }

    const folder = `businesses/${businessId}/card`;
    const isPdf = file.mimetype === 'application/pdf';
    const uploaded = await this.r2StorageService.upload(
      file.buffer,
      folder,
      file.originalname,
      file.mimetype,
    );

    if (card) {
      card.cardUrl = uploaded.url;
      card.fileType = isPdf ? CardFileType.PDF : CardFileType.IMAGE;
    } else {
      card = this.businessCardRepository.create({
        businessId,
        cardUrl: uploaded.url,
        fileType: isPdf ? CardFileType.PDF : CardFileType.IMAGE,
      });
    }

    const saved = await this.businessCardRepository.save(card);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_card_replaced', saved.id).catch(() => {});
    }
    return { success: true, message: 'Business card replaced', data: saved };
  }

  async remove(businessId: string, userId?: string): Promise<ServiceResponse<void>> {
    const card = await this.businessCardRepository.findOne({
      where: { businessId },
    });
    if (!card) {
      throw new NotFoundException('Business card not found');
    }

    // Delete from R2
    if (card.cardUrl) {
      const key = this.r2StorageService.extractKeyFromUrl(card.cardUrl);
      await this.r2StorageService.delete(key).catch(() => {});
    }

    await this.businessCardRepository.remove(card);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_card_deleted', businessId).catch(() => {});
    }
    return { success: true, message: 'Business card deleted' };
  }
}
