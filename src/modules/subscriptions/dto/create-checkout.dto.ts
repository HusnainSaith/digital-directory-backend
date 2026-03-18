import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ description: 'Subscription plan ID' })
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'Business ID to attach subscription to' })
  @IsUUID()
  businessId: string;
}
