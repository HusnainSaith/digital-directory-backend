import { Repository } from 'typeorm';

export const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue([]),
    execute: jest.fn(),
  })),
});

export const mockJwtService = () => ({
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
});

import { RoleEnum } from '../../src/modules/roles/role.enum';

export const createMockUser = () => ({
  id: 'test-user-id',
  email: 'test@example.com',
  fullName: 'Test User',
  password: 'hashedPassword',
  role: {
    id: 'role-id',
    name: RoleEnum.VISITOR,
    description: 'User role',
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdClientPlanQuotations: [],
});
