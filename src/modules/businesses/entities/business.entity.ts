import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { BusinessSocial } from './business-social.entity';
import { BusinessHour } from './business-hour.entity';
import { BusinessService } from './business-service.entity';
import { BusinessProduct } from './business-product.entity';
import { BusinessBranch } from './business-branch.entity';
import { Review } from '../../reviews/entities/review.entity';
import { User } from '../../users/entities/user.entity';
import { Country } from '../../countries/entities/country.entity';
import { City } from '../../cities/entities/city.entity';

@Entity('businesses')
@Index(['userId'])
@Index(['countryId'])
@Index(['categoryId'])
@Index(['cityId'])
@Index(['isApproved', 'isActive'])
@Index(['createdAt'])
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'country_id', nullable: true })
  countryId: string;

  @ManyToOne(() => Country, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'country_id' })
  countryEntity: Country;

  @Column({ name: 'city_id', nullable: true })
  cityId: string;

  @ManyToOne(() => City, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'city_id' })
  cityEntity: City;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 300, nullable: true })
  website: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string;

  @Column({ name: 'is_approved', default: false })
  isApproved: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  // --- Relations (kept for non-SRS tables) ---
  @OneToMany(() => BusinessSocial, (social) => social.business, { cascade: true })
  socials: BusinessSocial[];

  @OneToMany(() => BusinessHour, (hour) => hour.business, { cascade: true })
  businessHours: BusinessHour[];

  @OneToMany(() => BusinessService, (service) => service.business, { cascade: true })
  services: BusinessService[];

  @OneToMany(() => BusinessProduct, (product) => product.business, { cascade: true })
  products: BusinessProduct[];

  @OneToMany(() => BusinessBranch, (branch) => branch.business, { cascade: true })
  branches: BusinessBranch[];

  @OneToMany(() => Review, (review) => review.business)
  reviews: Review[];

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
