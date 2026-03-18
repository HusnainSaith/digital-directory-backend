import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

@Injectable()
export class R2HealthIndicator extends HealthIndicator {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'digital-directory-media');
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.get<string>('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'R2 storage health check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }
}
