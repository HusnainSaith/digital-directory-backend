import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [PermissionsGuard, RolesGuard],
  exports: [PermissionsGuard, RolesGuard, TypeOrmModule],
})
export class GuardsModule {}