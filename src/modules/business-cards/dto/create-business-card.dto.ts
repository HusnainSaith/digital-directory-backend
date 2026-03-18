import { IsOptional, IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CardFileType } from '../entities/business-card.entity';

export class CreateBusinessCardDto {
  @ApiProperty({ description: 'Card file URL' })
  @IsString()
  @IsNotEmpty()
  cardUrl: string;

  @ApiPropertyOptional({ enum: CardFileType, default: CardFileType.IMAGE })
  @IsOptional()
  @IsEnum(CardFileType)
  fileType?: CardFileType;
}

export class UpdateBusinessCardDto extends CreateBusinessCardDto {}
