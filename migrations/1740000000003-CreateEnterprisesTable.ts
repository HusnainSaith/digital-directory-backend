import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEnterprisesTable1740000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'enterprises',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '500',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'legal_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'logo',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'business_card',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'short_description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          // Tags stored as PostgreSQL text array
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'rating_avg',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'rating_count',
            type: 'integer',
            default: 0,
          },
          // 1 = $, 2 = $$, 3 = $$$, 4 = $$$$
          {
            name: 'price_range',
            type: 'smallint',
            isNullable: true,
          },
          {
            name: 'verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'founded_year',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'employee_range',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          // Certifications stored as PostgreSQL text array
          {
            name: 'certifications',
            type: 'text',
            isArray: true,
            isNullable: true,
            default: "'{}'",
          },

          // --- Owner Info (flattened from OwnerInfo interface) ---
          {
            name: 'owner_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'owner_title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'owner_bio',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'owner_photo',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'owner_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'owner_linkedin',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },

          // --- Contact Info (flattened from Contact interface, socials are separate table) ---
          {
            name: 'contact_phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'contact_email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contact_website',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },

          // --- Address (flattened from Address interface) ---
          {
            name: 'address_country',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'address_city',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'address_district',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'address_street',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'address_postal_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'address_lat',
            type: 'decimal',
            precision: 10,
            scale: 7,
            isNullable: true,
          },
          {
            name: 'address_lng',
            type: 'decimal',
            precision: 10,
            scale: 7,
            isNullable: true,
          },

          // --- Timestamps ---
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Indexes for common queries
    await queryRunner.createIndex(
      'enterprises',
      new TableIndex({ name: 'IDX_enterprises_slug', columnNames: ['slug'] }),
    );
    await queryRunner.createIndex(
      'enterprises',
      new TableIndex({
        name: 'IDX_enterprises_verified',
        columnNames: ['verified'],
      }),
    );
    await queryRunner.createIndex(
      'enterprises',
      new TableIndex({
        name: 'IDX_enterprises_address_city',
        columnNames: ['address_city'],
      }),
    );
    await queryRunner.createIndex(
      'enterprises',
      new TableIndex({
        name: 'IDX_enterprises_rating_avg',
        columnNames: ['rating_avg'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enterprises');
  }
}
