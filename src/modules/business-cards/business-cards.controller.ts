import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BusinessCardsService } from './business-cards.service';
import { CreateBusinessCardDto } from './dto/create-business-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { SecurityUtil } from '../../common/utils/security.util';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { ApiFileWithFields } from '../../common/decorators/api-file.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const ALLOWED_CARD_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_CARD_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Business Cards')
@Controller('businesses/:businessId/card')
export class BusinessCardsController extends BaseController {
  constructor(private readonly businessCardsService: BusinessCardsService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_CARD_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_CARD_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, WebP, and PDF files are allowed'), false);
        }
      },
    }),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiFileWithFields('file', {})
  @ApiOperation({ summary: 'Upload business card' })
  @ApiResponse({ status: 201, description: 'Business card uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  upload(
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateBusinessCardDto,
    @CurrentUser() user: User,
  ) {
    const validId = SecurityUtil.validateId(businessId);
    if (!file) throw new BadRequestException('File is required');
    return this.handleAsyncOperation(
      this.businessCardsService.upload(validId, file, user?.id),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get business card' })
  @ApiResponse({ status: 200, description: 'Business card retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Business card not found' })
  findOne(@Param('businessId') businessId: string) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.businessCardsService.findOne(validId));
  }

  @Put()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_CARD_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_CARD_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, WebP, and PDF files are allowed'), false);
        }
      },
    }),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Replace business card' })
  @ApiResponse({ status: 200, description: 'Business card replaced successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  replace(
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateBusinessCardDto,
    @CurrentUser() user: User,
  ) {
    const validId = SecurityUtil.validateId(businessId);
    if (!file) throw new BadRequestException('File is required');
    return this.handleAsyncOperation(
      this.businessCardsService.replace(validId, file, user?.id),
    );
  }

  @Delete()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete business card' })
  @ApiResponse({ status: 200, description: 'Business card deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business card not found' })
  remove(@Param('businessId') businessId: string, @CurrentUser() user: User) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(this.businessCardsService.remove(validId, user?.id));
  }
}
