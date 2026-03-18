import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Name of the permission',
    example: 'Create User',
    maxLength: 100,
  })
  @IsString({ message: 'Permission name must be a string' })
  @IsNotEmpty({ message: 'Permission name is required' })
  @MaxLength(100, { message: 'Permission name cannot exceed 100 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the permission',
    example: 'Allows creating a new user in the system',
    maxLength: 255,
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @ApiProperty({
    description: 'Resource the permission applies to',
    example: 'user',
    maxLength: 50,
  })
  @IsString({ message: 'Resource must be a string' })
  @IsNotEmpty({ message: 'Resource is required' })
  @MaxLength(50, { message: 'Resource cannot exceed 50 characters' })
  resource: string;

  @ApiProperty({
    description: 'Action allowed by this permission',
    example: 'create',
    maxLength: 50,
  })
  @IsString({ message: 'Action must be a string' })
  @IsNotEmpty({ message: 'Action is required' })
  @MaxLength(50, { message: 'Action cannot exceed 50 characters' })
  action: string;
}
