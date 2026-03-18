import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Country } from '../../countries/entities/country.entity';

@Entity('cities')
export class City {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'country_id', nullable: true })
  countryId: string;

  @ManyToOne(() => Country, (country) => country.cities, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
