import { PartialType } from '@nestjs/swagger';
import { CreateBusinessBranchDto } from './create-business-branch.dto';

export class UpdateBusinessBranchDto extends PartialType(
  CreateBusinessBranchDto,
) {}
