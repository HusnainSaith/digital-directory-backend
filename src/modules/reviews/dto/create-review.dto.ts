import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Business ID to review',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'Business ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Business ID is required' })
  businessId: string;

  @ApiProperty({
    description: 'Author name',
    example: 'John Doe',
    maxLength: 255,
  })
  @IsString({ message: 'Author name must be a string' })
  @IsNotEmpty({ message: 'Author name is required' })
  @MaxLength(255, { message: 'Author name cannot exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  authorName: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt({ message: 'Rating must be an integer' })
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  rating: number;

  @ApiPropertyOptional({
    description: 'Review comment',
    example: 'Excellent service and quality!',
  })
  @IsOptional()
  @IsString({ message: 'Comment must be a string' })
  @Transform(({ value }) => value?.trim())
  comment?: string;
}
