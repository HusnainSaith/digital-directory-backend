import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBusinessServiceDto {
  @ApiProperty({ example: 'Vehicle Import', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'Full vehicle import service from South Korea',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Price in base currency',
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/services/import.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
