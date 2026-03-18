import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { SecurityUtil } from '../../common/utils/security.util';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiFile } from '../../common/decorators/api-file.decorator';
@ApiTags('Businesses')
@Controller('businesses')
export class BusinessesController extends BaseController {
  constructor(private readonly businessesService: BusinessesService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a business' })
  @ApiResponse({ status: 201, description: 'Business created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Permissions('businesses.create')
  create(@Body() dto: CreateBusinessDto, @CurrentUser() user: User) {
    return this.handleAsyncOperation(this.businessesService.create(dto, user.id));
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get businesses owned by current user' })
  @ApiResponse({ status: 200, description: 'User businesses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findMine(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.handleAsyncOperation(
      this.businessesService.findByUser(user.id, { page, limit }),
    );
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all businesses with filtering' })
  @ApiResponse({ status: 200, description: 'Businesses list retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
  ) {
    // Country always from subdomain — cannot be overridden by public users (SRS §5.2)
    const resolvedCountryId = req.country?.id;
    return this.handleAsyncOperation(
      this.businessesService.findAll({ page, limit, category, city, search, countryId: resolvedCountryId }),
    );
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get business by ID' })
  @ApiResponse({ status: 200, description: 'Business retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  findOne(@Param('id') id: string, @CurrentUser() user?: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.businessesService.findOne(validId, user?.id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a business' })
  @ApiResponse({ status: 200, description: 'Business updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @Permissions('businesses.update')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessDto, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.businessesService.update(validId, dto, user?.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a business' })
  @ApiResponse({ status: 200, description: 'Business deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @Permissions('businesses.delete')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.businessesService.remove(validId, user?.id));
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Business owner deactivates their own listing' })
  @ApiResponse({ status: 200, description: 'Business deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  deactivate(@Param('id') id: string, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.businessesService.toggleActive(validId, user.id, false));
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Business owner reactivates their own listing' })
  @ApiResponse({ status: 200, description: 'Business activated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  activate(@Param('id') id: string, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.businessesService.toggleActive(validId, user.id, true));
  }

  @Post(':id/logo')
  @UseGuards(JwtAuthGuard, OwnershipGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|svg\+xml)$/)) {
          return cb(new BadRequestException('Only image files are allowed (JPEG, PNG, WebP, SVG)'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiFile('file')
  @ApiOperation({ summary: 'Upload business logo' })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @Permissions('businesses.update')
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(this.businessesService.uploadLogo(validId, file));
  }
}
