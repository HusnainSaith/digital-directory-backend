import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { SecurityUtil } from '../../common/utils/security.util';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { RoleEnum } from '../roles/role.enum';
import { R2StorageService } from '../../common/services/r2-storage.service';

// Allowed MIME types for business logos
const ALLOWED_LOGO_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private readonly r2StorageService: R2StorageService,
  ) {}

  async create(dto: CreateBusinessDto, userId?: string): Promise<ServiceResponse<Business>> {
    SecurityUtil.validateObject(dto);

    const business = this.businessRepository.create({
      name: dto.name,
      description: dto.description,
      phone: dto.phone,
      email: dto.email,
      website: dto.website,
      address: dto.address,
      logoUrl: dto.logoUrl,
      userId: userId || undefined,
      countryId: dto.countryId || undefined,
      cityId: dto.cityId || undefined,
      categoryId: dto.categoryId || undefined,
    });

    const saved = await this.businessRepository.save(business);
    const result = await this.findOneEntity(saved.id);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_created', saved.id).catch(() => {});
    }
    // Notify admins about new listing submission (SRS: Listing Submitted → Admin)
    this.notifyAdminsNewListing(saved.name);
    return { success: true, message: 'Business created successfully', data: result };
  }

  private notifyAdminsNewListing(businessName: string): void {
    // Fire-and-forget — do not block the calling request
    (async () => {
      try {
        const admins = await this.userRepository.find({
          where: { isActive: true },
          relations: ['role'],
        });

        const adminUsers = admins.filter(
          (u) => u.role?.name === RoleEnum.ADMIN || u.role?.name === RoleEnum.SUPER_ADMIN,
        );

        // Send all admin notifications in parallel instead of sequentially
        await Promise.all(
          adminUsers.map((admin) =>
            this.notificationsService.sendEmail(
              'new-listing-submitted',
              admin.email,
              `New Business Listing: ${businessName}`,
              { recipientName: admin.name, businessName },
              admin.id,
            ).catch((err) => this.logger.error(`Failed to notify admin ${admin.email}: ${err.message}`)),
          ),
        );
      } catch (err) {
        this.logger.error(`notifyAdminsNewListing failed: ${err.message}`);
      }
    })();
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    category?: string;
    city?: string;
    search?: string;
    publicView?: boolean;
    countryId?: string;
  }): Promise<ServiceResponse<Business[]>> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 20;
      const isPublic = query?.publicView !== false; // default to public

      // List view: only load lightweight relations needed for cards/tiles.
      // Detail-heavy relations (services, products, branches, socials, hours)
      // are loaded separately when fetching a single business via findOne.
      const qb = this.businessRepository
        .createQueryBuilder('business')
        .leftJoinAndSelect('business.category', 'category');

      // Public visibility gate: only approved + active + subscribed businesses
      if (isPublic) {
        qb.andWhere('business.is_approved = true');
        qb.andWhere('business.is_active = true');
        qb.andWhere(
          `EXISTS (SELECT 1 FROM subscriptions s WHERE s.business_id = business.id AND s.status = 'active' AND s.end_date > NOW())`,
        );
      }

      // Country scoping (from subdomain or explicit filter)
      if (query?.countryId) {
        qb.andWhere('business.country_id = :countryId', { countryId: query.countryId });
      }

      if (query?.category) {
        qb.andWhere('business.category_id = :categoryId', { categoryId: query.category });
      }

      if (query?.city) {
        qb.andWhere('business.city_id = :cityId', { cityId: query.city });
      }

      if (query?.search) {
        qb.andWhere(
          '(business.name ILIKE :search OR business.description ILIKE :search)',
          { search: `%${query.search}%` },
        );
      }

      qb.orderBy('business.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();

      return {
        success: true,
        message: 'Businesses retrieved successfully',
        data,
        meta: { total, page, limit },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve businesses: ${error.message}`);
    }
  }

  async findOne(id: string, requestingUserId?: string): Promise<ServiceResponse<Business>> {
    try {
      const business = await this.findOneEntity(id);
      if (!business) throw new NotFoundException('Business not found');

      // If not the user, enforce visibility gate (approved + active + subscribed)
      if (business.userId !== requestingUserId) {
        if (!business.isApproved || !business.isActive) {
          throw new NotFoundException('Business not found');
        }
        // Check active subscription
        const hasSubscription = await this.businessRepository.manager.query(
          `SELECT 1 FROM subscriptions WHERE business_id = $1 AND status = 'active' AND end_date > NOW() LIMIT 1`,
          [id],
        );
        if (!hasSubscription?.length) {
          throw new NotFoundException('Business not found');
        }
      }

      return { success: true, message: 'Business retrieved successfully', data: business };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to retrieve business: ${error.message}`);
    }
  }

  async update(id: string, dto: UpdateBusinessDto, userId?: string): Promise<ServiceResponse<Business>> {
    SecurityUtil.validateObject(dto);

    const business = await this.businessRepository.findOne({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    if (dto.name !== undefined) business.name = dto.name;
    if (dto.description !== undefined) business.description = dto.description;
    if (dto.phone !== undefined) business.phone = dto.phone;
    if (dto.email !== undefined) business.email = dto.email;
    if (dto.website !== undefined) business.website = dto.website;
    if (dto.address !== undefined) business.address = dto.address;
    if (dto.logoUrl !== undefined) business.logoUrl = dto.logoUrl;
    if (dto.countryId !== undefined) business.countryId = dto.countryId;
    if (dto.cityId !== undefined) business.cityId = dto.cityId;
    if (dto.categoryId !== undefined) business.categoryId = dto.categoryId;

    await this.businessRepository.save(business);
    const result = await this.findOneEntity(id);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_updated', id).catch(() => {});
    }
    return { success: true, message: 'Business updated successfully', data: result };
  }

  async remove(id: string, userId?: string): Promise<ServiceResponse<void>> {
    try {
      const business = await this.businessRepository.findOne({ where: { id } });
      if (!business) throw new NotFoundException('Business not found');
      
      // Delete logo from R2 if exists
      if (business.logoUrl) {
        try {
          const key = this.r2StorageService.extractKeyFromUrl(business.logoUrl);
          if (key) {
            await this.r2StorageService.delete(key);
          }
        } catch (error) {
          this.logger.warn('Failed to delete business logo from R2:', error.message);
        }
      }
      
      await this.businessRepository.remove(business);
      if (userId) {
        this.notificationsService.logActivity(userId, 'business_deleted', id).catch(() => {});
      }
      return { success: true, message: 'Business deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to delete business: ${error.message}`);
    }
  }

  async findByUser(
    userId: string,
    query?: { page?: number; limit?: number },
  ): Promise<ServiceResponse<Business[]>> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;

    // Owner list view: omit detail-heavy one-to-many relations (socials,
    // hours, services, products, branches). They are loaded in findOne.
    const [data, total] = await this.businessRepository.findAndCount({
      where: { userId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'User businesses retrieved successfully',
      data,
      meta: { total, page, limit },
    };
  }

  private async findOneEntity(id: string): Promise<Business | null> {
    return this.businessRepository.findOne({
      where: { id },
      relations: [
        'category',
        'socials',
        'businessHours',
        'services',
        'products',
        'branches',
        'reviews',
      ],
    });
  }

  async toggleActive(
    businessId: string,
    userId: string,
    active: boolean,
  ): Promise<ServiceResponse<Business>> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId, userId },
    });
    if (!business) {
      throw new NotFoundException('Business not found or you are not the owner');
    }

    business.isActive = active;
    await this.businessRepository.save(business);
    this.notificationsService.logActivity(userId, active ? 'business_activated' : 'business_deactivated', businessId).catch(() => {});

    return {
      success: true,
      message: active ? 'Business activated' : 'Business deactivated',
      data: business,
    };
  }

  async uploadLogo(businessId: string, file: Express.Multer.File): Promise<ServiceResponse<Business>> {
    try {
      // Validate file type
      if (!ALLOWED_LOGO_MIMES.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${ALLOWED_LOGO_MIMES.join(', ')}`,
        );
      }

      // Validate file size
      if (file.size > MAX_LOGO_SIZE) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size of ${MAX_LOGO_SIZE / 1024 / 1024}MB`,
        );
      }

      // Find business
      const business = await this.businessRepository.findOne({ where: { id: businessId } });
      if (!business) {
        throw new NotFoundException('Business not found');
      }

      // Delete old logo from R2 if exists
      if (business.logoUrl) {
        try {
          const oldKey = this.r2StorageService.extractKeyFromUrl(business.logoUrl);
          if (oldKey) {
            await this.r2StorageService.delete(oldKey);
          }
        } catch (error) {
          this.logger.warn('Failed to delete old business logo:', error.message);
        }
      }

      // Upload new logo to R2
      const result = await this.r2StorageService.upload(
        file.buffer,
        `businesses/${businessId}/logo`,
        file.originalname,
        file.mimetype,
      );

      // Update business with new logo URL
      business.logoUrl = result.url;
      const updated = await this.businessRepository.save(business);

      return { success: true, message: 'Business logo uploaded successfully', data: updated };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new Error(`Failed to upload business logo: ${error.message}`);
    }
  }
}
