import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';

@Entity('business_hours')
export class BusinessHour {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  })
  dayOfWeek: string;

  @Column({ name: 'open_time' })
  openTime: string;

  @Column({ name: 'close_time' })
  closeTime: string;

  @Column({ name: 'is_closed', default: false })
  isClosed: boolean;

  @ManyToOne(() => Business, (business) => business.businessHours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
