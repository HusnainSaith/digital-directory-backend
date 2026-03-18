import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessMedia, MediaType } from './entities/business-media.entity';
import { R2StorageService } from '../../common/services/r2-storage.service';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

const ALLOWED_MIMES: Record<MediaType, string[]> = {
  [MediaType.IMAGE]: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  [MediaType.VIDEO]: ['video/mp4', 'video/webm'],
};

const MAX_SIZES: Record<MediaType, number> = {
  [MediaType.IMAGE]: 5 * 1024 * 1024,    // 5MB
  [MediaType.VIDEO]: 50 * 1024 * 1024,   // 50MB
};

@Injectable()
export class BusinessMediaService {
  constructor(
    @InjectRepository(BusinessMedia)
    private readonly businessMediaRepository: Repository<BusinessMedia>,
    private readonly r2StorageService: R2StorageService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async upload(
    businessId: string,
    file: Express.Multer.File,
    mediaType?: MediaType,
    userId?: string,
    sortOrder?: number,
  ): Promise<ServiceResponse<BusinessMedia>> {
    // Determine media type from MIME if not provided
    const resolvedType = mediaType || this.resolveMediaType(file.mimetype);

    // Validate MIME against allowed types
    const allowedMimes = ALLOWED_MIMES[resolvedType];
    if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type for ${resolvedType}. Allowed: ${allowedMimes?.join(', ')}`,
      );
    }

    // Validate size
    const maxSize = MAX_SIZES[resolvedType];
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large for ${resolvedType}. Maximum: ${maxSize / (1024 * 1024)}MB`,
      );
    }

    const folder = `businesses/${businessId}/${resolvedType}s`;
    const uploaded = await this.r2StorageService.upload(
      file.buffer,
      folder,
      file.originalname,
      file.mimetype,
    );

    const media = this.businessMediaRepository.create({
      businessId,
      mediaUrl: uploaded.url,
      mediaType: resolvedType,
      sortOrder: sortOrder ?? 0,
    });

    const saved = await this.businessMediaRepository.save(media);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_media_uploaded', saved.id).catch(() => {});
    }
    return { success: true, message: 'Media uploaded successfully', data: saved };
  }

  async findAll(businessId: string, mediaType?: MediaType): Promise<ServiceResponse<BusinessMedia[]>> {
    const where: any = { businessId };
    if (mediaType) where.mediaType = mediaType;

    const media = await this.businessMediaRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return { success: true, message: 'Media retrieved', data: media };
  }

  async remove(id: string, businessId: string, userId?: string): Promise<ServiceResponse<void>> {
    const media = await this.businessMediaRepository.findOne({
      where: { id, businessId },
    });
    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Delete from R2
    if (media.mediaUrl) {
      const key = this.r2StorageService.extractKeyFromUrl(media.mediaUrl);
      await this.r2StorageService.delete(key).catch(() => {});
    }

    await this.businessMediaRepository.remove(media);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_media_deleted', id).catch(() => {});
    }
    return { success: true, message: 'Media deleted' };
  }

  private resolveMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.IMAGE; // default
  }
}
