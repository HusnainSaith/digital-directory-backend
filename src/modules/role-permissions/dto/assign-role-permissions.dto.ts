import { IsArray, IsEnum, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionActionEnum } from 'src/common/enums/permission-actions.enum';

export class AssignRolePermissionsDto {
  @ApiProperty({
    description: 'List of permission UUIDs to assign to the role',
    example: [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ],
    isArray: true,
    type: String,
  })
  @IsArray({ message: 'Permission IDs must be an array' })
  @IsNotEmpty({ message: 'At least one permission ID is required' })
  @IsUUID('4', { each: true, message: 'Each permission ID must be a valid UUID' })
  permissionIds: string[];

  @ApiPropertyOptional({
    description: 'Action to apply for these permissions',
    enum: PermissionActionEnum,
    example: PermissionActionEnum.CREATE,
  })
  @IsOptional()
  @IsEnum(PermissionActionEnum, { message: 'Action must be a valid permission action' })
  action?: PermissionActionEnum;
}
