import { IsString, IsOptional, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusinessBranchDto {
  @ApiProperty({ example: 'Av. Circunvalacion, Iquique, Chile', description: 'Branch address' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'uuid', description: 'City UUID (required)' })
  @IsUUID()
  @IsNotEmpty({ message: 'City is required for a branch' })
  cityId: string;

  @ApiPropertyOptional({ example: '+56 9 8765 4321', maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: '09:00-18:00 Mon-Fri' })
  @IsString()
  @IsOptional()
  operatingHours?: string;
}
