import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserPermission } from './entities/user-permission.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';
import { TokenUtil } from 'src/common/utils/jwt.util';
import { SharedModule } from '../shared/shared.module';
import { GuardsModule } from '../../common/modules/guards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserPermission,
      Role,
      Permission,
      RolePermission,
    ]),
    SharedModule,
    GuardsModule,
    NotificationsModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, TokenUtil],
  exports: [UsersService, TokenUtil, TypeOrmModule],
})
export class UsersModule {}
