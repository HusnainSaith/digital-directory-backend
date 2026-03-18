import { IsOptional, IsString, MaxLength, MinLength, IsUrl, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(150, { message: 'Name must not exceed 150 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  phone?: string;
}

export class UpdateAvatarDto {
  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsNotEmpty({ message: 'Avatar URL is required' })
  @IsUrl({}, { message: 'Must be a valid URL' })
  @MaxLength(500, { message: 'Avatar URL must not exceed 500 characters' })
  avatarUrl: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!',
  })
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}
