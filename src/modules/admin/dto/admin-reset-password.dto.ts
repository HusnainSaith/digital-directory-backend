import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminResetPasswordDto {
  @ApiPropertyOptional({ description: 'New password to set. If omitted, a temporary password is generated.' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
