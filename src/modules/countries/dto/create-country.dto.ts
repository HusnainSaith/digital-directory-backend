import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCountryDto {
  @ApiProperty({ example: 'South Korea' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'KR', description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  countryCode: string;

  @ApiProperty({ example: 'south-korea', description: 'Subdomain for this country' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  subdomain: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
