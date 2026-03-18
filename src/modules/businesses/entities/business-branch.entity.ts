import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { City } from '../../cities/entities/city.entity';

@Entity('business_branches')
export class BusinessBranch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ name: 'city_id', nullable: true })
  cityId: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({ name: 'operating_hours', type: 'text', nullable: true })
  operatingHours: string;

  @ManyToOne(() => Business, (business) => business.branches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => City, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
