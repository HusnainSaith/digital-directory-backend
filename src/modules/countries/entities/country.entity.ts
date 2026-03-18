import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { City } from '../../cities/entities/city.entity';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'country_code', unique: true, length: 10 })
  countryCode: string;

  @Column({ unique: true, length: 50 })
  subdomain: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => City, (city) => city.country)
  cities: City[];
}
