import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class R2StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(R2StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'digital-directory-media');
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL', '');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      forcePathStyle: false, // R2 uses virtual-hosted-style
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  /**
   * Upload a file buffer to Cloudflare R2.
   * @param buffer - File content
   * @param folder - Folder path (e.g., 'businesses/{id}/images')
   * @param originalName - Original filename for extension extraction
   * @param mimeType - MIME type of the file
   * @returns UploadResult with key and public URL
   */
  async upload(
    buffer: Buffer,
    folder: string,
    originalName: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const ext = path.extname(originalName) || this.getExtFromMime(mimeType);
    const key = `${folder}/${uuidv4()}${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const url = this.getPublicUrl(key);

    this.logger.log(`File uploaded to R2: ${key}`);

    return {
      key,
      url,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Delete a file from R2 by its key.
   */
  async delete(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`File deleted from R2: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from R2: ${key}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract the R2 key from a full public URL.
   */
  extractKeyFromUrl(url: string): string {
    if (!this.publicUrl) return url;
    return url.replace(this.publicUrl + '/', '');
  }

  /**
   * Get the full public CDN URL for a key.
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  private getExtFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'application/pdf': '.pdf',
    };
    return map[mimeType] || '';
  }
}
