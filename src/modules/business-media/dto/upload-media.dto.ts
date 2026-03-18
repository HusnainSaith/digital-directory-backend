import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '../entities/business-media.entity';

export class UploadMediaDto {
  @ApiPropertyOptional({ enum: MediaType, default: MediaType.IMAGE })
  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @ApiPropertyOptional({ example: 0, description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
