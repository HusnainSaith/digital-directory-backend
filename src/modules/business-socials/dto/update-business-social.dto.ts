import { PartialType } from '@nestjs/swagger';
import { CreateBusinessSocialDto } from './create-business-social.dto';

export class UpdateBusinessSocialDto extends PartialType(CreateBusinessSocialDto) {}
