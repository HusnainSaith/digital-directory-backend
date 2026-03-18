import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'billing_cycle', length: 20, default: 'MONTHLY' })
  billingCycle: string;

  @Column({ name: 'duration_in_days', type: 'int', default: 30 })
  durationInDays: number;

  @Column({ type: 'text', array: true, nullable: true })
  features: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'stripe_price_id', length: 100, nullable: true })
  stripePriceId: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @OneToMany(() => Subscription, (subscription) => subscription.plan)
  subscriptions: Subscription[];
}
