import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessBranch } from '../businesses/entities/business-branch.entity';
import { CreateBusinessBranchDto } from './dto/create-business-branch.dto';
import { UpdateBusinessBranchDto } from './dto/update-business-branch.dto';
import { ServiceResponse } from '../../common/interfaces/service-response.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BusinessBranchesService {
  constructor(
    @InjectRepository(BusinessBranch)
    private readonly branchRepository: Repository<BusinessBranch>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    businessId: string,
    dto: CreateBusinessBranchDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessBranch>> {
    const branch = this.branchRepository.create({ ...dto, businessId });
    const saved = await this.branchRepository.save(branch);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_branch_created', saved.id).catch(() => {});
    }
    return { success: true, message: 'Branch created', data: saved };
  }

  async findAll(businessId: string): Promise<ServiceResponse<BusinessBranch[]>> {
    const branches = await this.branchRepository.find({
      where: { businessId },
      relations: ['city'],
      order: { createdAt: 'ASC' },
    });
    return { success: true, message: 'Branches retrieved', data: branches };
  }

  async findOne(id: string, businessId: string): Promise<ServiceResponse<BusinessBranch>> {
    const branch = await this.branchRepository.findOne({
      where: { id, businessId },
      relations: ['city'],
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return { success: true, message: 'Branch retrieved', data: branch };
  }

  async update(
    id: string,
    businessId: string,
    dto: UpdateBusinessBranchDto,
    userId?: string,
  ): Promise<ServiceResponse<BusinessBranch>> {
    const branch = await this.branchRepository.findOne({ where: { id, businessId } });
    if (!branch) throw new NotFoundException('Branch not found');
    Object.assign(branch, dto);
    const saved = await this.branchRepository.save(branch);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_branch_updated', id).catch(() => {});
    }
    return { success: true, message: 'Branch updated', data: saved };
  }

  async remove(id: string, businessId: string, userId?: string): Promise<ServiceResponse<void>> {
    const branch = await this.branchRepository.findOne({ where: { id, businessId } });
    if (!branch) throw new NotFoundException('Branch not found');
    await this.branchRepository.remove(branch);
    if (userId) {
      this.notificationsService.logActivity(userId, 'business_branch_deleted', id).catch(() => {});
    }
    return { success: true, message: 'Branch deleted', data: null };
  }
}
