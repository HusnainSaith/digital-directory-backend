import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BusinessMediaService } from './business-media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { SecurityUtil } from '../../common/utils/security.util';
import { MediaType } from '../../common/enums/media-type.enum';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/controllers/base.controller';
import { ApiFileWithFields } from '../../common/decorators/api-file.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const ALL_ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'application/pdf',
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max (video)

@ApiTags('Business Media')
@Controller('businesses/:businessId/media')
export class BusinessMediaController extends BaseController {
  constructor(private readonly businessMediaService: BusinessMediaService) {
    super();
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALL_ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
        }
      },
    }),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiFileWithFields('file', {
    mediaType: { type: 'string', enum: ['image', 'video'], description: 'Type of media' },
  })
  @ApiOperation({ summary: 'Upload media (image, video, or document)' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  upload(
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: User,
  ) {
    const validId = SecurityUtil.validateId(businessId);
    if (!file) throw new BadRequestException('File is required');
    return this.handleAsyncOperation(
      this.businessMediaService.upload(validId, file, dto.mediaType, user?.id, dto.sortOrder),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List media for a business' })
  @ApiResponse({ status: 200, description: 'Business media list retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Business not found' })
  @ApiQuery({ name: 'mediaType', required: false, enum: MediaType })
  findAll(
    @Param('businessId') businessId: string,
    @Query('mediaType') mediaType?: MediaType,
  ) {
    const validId = SecurityUtil.validateId(businessId);
    return this.handleAsyncOperation(
      this.businessMediaService.findAll(validId, mediaType),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete media' })
  @ApiResponse({ status: 200, description: 'Media deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  remove(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const validBusinessId = SecurityUtil.validateId(businessId);
    const validId = SecurityUtil.validateId(id);
    return this.handleAsyncOperation(
      this.businessMediaService.remove(validId, validBusinessId, user?.id),
    );
  }
}
