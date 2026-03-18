import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusinessHourDto {
  @ApiProperty({ example: 'mon', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] })
  @IsString()
  @IsNotEmpty()
  dayOfWeek: string;

  @ApiPropertyOptional({ example: '09:00', description: 'Opening time (HH:MM). Required if isClosed is false.' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  openTime?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Closing time (HH:MM). Required if isClosed is false.' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  closeTime?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;
}
