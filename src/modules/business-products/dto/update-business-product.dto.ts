import { PartialType } from '@nestjs/swagger';
import { CreateBusinessProductDto } from './create-business-product.dto';

export class UpdateBusinessProductDto extends PartialType(CreateBusinessProductDto) {}
