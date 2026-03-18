import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ description: 'Plan display name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Plan price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Duration in days', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationInDays?: number;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Billing cycle', enum: ['MONTHLY', 'YEARLY'], default: 'MONTHLY' })
  @IsOptional()
  @IsString()
  @IsIn(['MONTHLY', 'YEARLY'])
  billingCycle?: string;

  @ApiPropertyOptional({ description: 'Plan features list', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Whether plan is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Stripe price ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stripePriceId?: string;
}
