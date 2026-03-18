import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'The unique name of the role',
    example: 'super_admin',
    maxLength: 50,
  })
  @IsString({ message: 'Role name must be a string' })
  @IsNotEmpty({ message: 'Role name is required' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'A description for the role',
    example: 'Grants full administrative access.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;
}
