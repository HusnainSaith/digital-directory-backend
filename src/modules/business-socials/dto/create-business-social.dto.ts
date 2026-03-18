import { IsString, IsUrl, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusinessSocialDto {
  @ApiProperty({ example: 'facebook', description: 'Social platform type (e.g. facebook, instagram, twitter, linkedin, youtube, tiktok, whatsapp)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @ApiProperty({ example: 'https://facebook.com/mycompany' })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
