import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Main Create Business DTO (SRS v2.0) ---
// Sub-resources (socials, hours, gallery, services, products, branches)
// are managed via their own dedicated endpoints under /businesses/:id/[resource]

export class CreateBusinessDto {
  @ApiProperty({ example: 'DAIM AUTOS Ltd.' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'Leading automotive trading company...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '+82 10 5012 5756' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@daimautos.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'https://www.daimautos.com' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @ApiPropertyOptional({ example: 'Oekryen-dong 194-75, Yeonsu-gu, Incheon' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://media.example.com/logos/daim.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ description: 'Country UUID' })
  @IsNotEmpty({ message: 'Country is required' })
  @IsUUID()
  countryId: string;

  @ApiProperty({ description: 'City UUID' })
  @IsNotEmpty({ message: 'City is required' })
  @IsUUID()
  cityId: string;

  @ApiProperty({ description: 'Category UUID' })
  @IsNotEmpty({ message: 'Category is required' })
  @IsUUID()
  categoryId: string;
}
