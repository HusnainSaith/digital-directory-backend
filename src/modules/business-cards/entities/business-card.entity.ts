import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '../../businesses/entities/business.entity';

export enum CardFileType {
  IMAGE = 'image',
  PDF = 'pdf',
}

@Entity('business_cards')
export class BusinessCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', unique: true })
  businessId: string;

  @Column({ name: 'card_url', type: 'text' })
  cardUrl: string;

  @Column({
    name: 'file_type',
    type: 'enum',
    enum: CardFileType,
    default: CardFileType.IMAGE,
  })
  fileType: CardFileType;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
