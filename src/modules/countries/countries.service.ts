import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CountriesService {
  // In-memory cache for subdomain lookups (TTL: 5 minutes)
  private subdomainCache = new Map<string, { country: Country; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateCountryDto, userId?: string): Promise<ServiceResponse<Country>> {
    const existing = await this.countryRepository.findOne({
      where: [{ countryCode: dto.countryCode }, { subdomain: dto.subdomain }],
    });
    if (existing) {
      throw new ConflictException('A country with this code or subdomain already exists');
    }

    const country = this.countryRepository.create(dto);
    const saved = await this.countryRepository.save(country);
    this.clearCache();
    if (userId) {
      this.notificationsService.logActivity(userId, 'country_created', saved.id).catch(() => {});
    }
    return { success: true, message: 'Country created successfully', data: saved };
  }

  async findAll(query?: { includeInactive?: boolean }): Promise<ServiceResponse<Country[]>> {
    const where: any = {};
    if (!query?.includeInactive) {
      where.isActive = true;
    }
    const countries = await this.countryRepository.find({
      where,
      order: { name: 'ASC' },
    });
    return { success: true, message: 'Countries retrieved successfully', data: countries };
  }

  async findOne(id: string): Promise<ServiceResponse<Country>> {
    const country = await this.countryRepository.findOne({
      where: { id },
      relations: ['cities'],
    });
    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found`);
    }
    return { success: true, message: 'Country retrieved successfully', data: country };
  }

  async findBySubdomain(subdomain: string): Promise<Country | null> {
    // Check cache first
    const cached = this.subdomainCache.get(subdomain);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.country;
    }

    const country = await this.countryRepository.findOne({
      where: { subdomain, isActive: true },
    });

    if (country) {
      this.subdomainCache.set(subdomain, {
        country,
        expiresAt: Date.now() + this.CACHE_TTL,
      });
    }

    return country || null;
  }

  async update(id: string, dto: UpdateCountryDto, userId?: string): Promise<ServiceResponse<Country>> {
    const country = await this.countryRepository.findOne({ where: { id } });
    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found`);
    }

    // Check code/subdomain uniqueness if being changed
    if (dto.countryCode || dto.subdomain) {
      const conditions: any[] = [];
      if (dto.countryCode && dto.countryCode !== country.countryCode) conditions.push({ countryCode: dto.countryCode });
      if (dto.subdomain && dto.subdomain !== country.subdomain) conditions.push({ subdomain: dto.subdomain });

      if (conditions.length > 0) {
        const existing = await this.countryRepository.findOne({ where: conditions });
        if (existing && existing.id !== id) {
          throw new ConflictException('A country with this code or subdomain already exists');
        }
      }
    }

    Object.assign(country, dto);
    const saved = await this.countryRepository.save(country);
    this.clearCache();
    if (userId) {
      this.notificationsService.logActivity(userId, 'country_updated', id).catch(() => {});
    }
    return { success: true, message: 'Country updated successfully', data: saved };
  }

  async remove(id: string, userId?: string): Promise<ServiceResponse<void>> {
    const country = await this.countryRepository.findOne({ where: { id } });
    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found`);
    }

    // Soft delete: set isActive = false
    country.isActive = false;
    await this.countryRepository.save(country);
    this.clearCache();
    if (userId) {
      this.notificationsService.logActivity(userId, 'country_deactivated', id).catch(() => {});
    }
    return { success: true, message: 'Country deactivated successfully' };
  }

  private clearCache(): void {
    this.subdomainCache.clear();
  }
}
