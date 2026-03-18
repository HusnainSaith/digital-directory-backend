import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { SecurityUtil } from '../../common/utils/security.util';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(City)
    private cityRepository: Repository<City>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateCityDto, userId?: string): Promise<ServiceResponse<City>> {
    try {
      SecurityUtil.validateObject(dto);

      const existing = await this.cityRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A city with this name already exists');
      }

      const city = this.cityRepository.create(dto);
      const saved = await this.cityRepository.save(city);
      if (userId) {
        this.notificationsService.logActivity(userId, 'city_created', saved.id).catch(() => {});
      }
      return { success: true, message: 'City created successfully', data: saved };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new Error(`Failed to create city: ${error.message}`);
    }
  }

  async findAll(query?: {
    countryId?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }): Promise<ServiceResponse<City[]>> {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 100;
      const where: any = {};

      if (!query?.includeInactive) {
        where.isActive = true;
      }

      if (query?.countryId) {
        where.countryId = query.countryId;
      }

      const [data, total] = await this.cityRepository.findAndCount({
        where,
        order: { name: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        success: true,
        message: 'Cities retrieved successfully',
        data,
        meta: { total, page, limit },
      };
    } catch (error) {
      throw new Error(`Failed to retrieve cities: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<ServiceResponse<City>> {
    try {
      const city = await this.cityRepository.findOne({ where: { id } });
      if (!city) throw new NotFoundException('City not found');
      return { success: true, message: 'City retrieved successfully', data: city };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to retrieve city: ${error.message}`);
    }
  }

  async update(id: string, dto: UpdateCityDto, userId?: string): Promise<ServiceResponse<City>> {
    try {
      SecurityUtil.validateObject(dto);

      const city = await this.cityRepository.findOne({ where: { id } });
      if (!city) throw new NotFoundException('City not found');

      if (dto.name && dto.name !== city.name) {
        const existing = await this.cityRepository.findOne({ where: { name: dto.name } });
        if (existing) throw new ConflictException('A city with this name already exists');
      }

      Object.assign(city, dto);
      const saved = await this.cityRepository.save(city);
      if (userId) {
        this.notificationsService.logActivity(userId, 'city_updated', id).catch(() => {});
      }
      return { success: true, message: 'City updated successfully', data: saved };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
      throw new Error(`Failed to update city: ${error.message}`);
    }
  }

  async remove(id: string, userId?: string): Promise<ServiceResponse<void>> {
    try {
      const city = await this.cityRepository.findOne({ where: { id } });
      if (!city) throw new NotFoundException('City not found');
      
      city.isActive = false;
      await this.cityRepository.save(city);
      if (userId) {
        this.notificationsService.logActivity(userId, 'city_deactivated', id).catch(() => {});
      }
      return { success: true, message: 'City deactivated successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new Error(`Failed to deactivate city: ${error.message}`);
    }
  }
}
