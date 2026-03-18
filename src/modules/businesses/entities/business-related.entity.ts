import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('enterprise_related')
export class BusinessRelated {
  @PrimaryColumn({ name: 'enterprise_id', type: 'uuid' })
  enterpriseId: string;

  @PrimaryColumn({ name: 'related_enterprise_id', type: 'uuid' })
  relatedEnterpriseId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Business;

  @ManyToOne(() => Business, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'related_enterprise_id' })
  relatedEnterprise: Business;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
