import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'The new unique name of the role',
    example: 'super_admin',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Role name must be a string' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'The new description for the role',
    example: 'Grants full administrative access.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;
}
