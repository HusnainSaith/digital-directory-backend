import { IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBusinessProductDto {
  @ApiProperty({ example: 'Hyundai Tucson 2024' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Brand new SUV model' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'HT-2024-001', description: 'Stock keeping unit', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order', minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ example: 29999.99, description: 'Product price' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ example: 'https://media.example.com/products/img.jpg', description: 'Product image URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
