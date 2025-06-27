import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageAdapter } from './storage.adapter';
import { StorageFile } from '@app/types';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class S3Storage extends StorageAdapter {
  protected readonly logger = new Logger(S3Storage.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cloudfrontDomain: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.region = this.config.get<string>('AWS_REGION', 'ap-northeast-2');
    this.bucket = this.config.get<string>('AWS_S3_BUCKET', '');
    this.cloudfrontDomain = this.config.get<string>('CLOUDFRONT_DOMAIN', '');
    if (!this.cloudfrontDomain) {
      throw new Error('CLOUDFRONT_DOMAIN 환경변수가 필요합니다.');
    }
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async upload(
    { originalName, buffer }: StorageFile,
    generateFileName: (fileName: string) => string,
  ): Promise<string> {
    const fileName = generateFileName(originalName);
    const s3Key = `uploads/${fileName}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: buffer,
        }),
      );
      this.logger.log(
        `File uploaded to S3 successfully. S3 key: ${s3Key}`,
      );

      // CloudFront URL만 반환
      return `${this.cloudfrontDomain.replace(/\/$/, '')}/${s3Key}`;
    } catch (error) {
      this.logger.error('Failed to upload file to S3', error);
      throw error;
    }
  }

  async download(path: string): Promise<Buffer> {
    const s3Key = path.startsWith('/') ? path.slice(1) : path;
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        }),
      );
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Failed to download file from S3', error);
      throw error;
    }
  }

  async removeFile(path: string): Promise<void> {
    const s3Key = path.startsWith('/') ? path.slice(1) : path;
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        }),
      );
      this.logger.log(`File deleted from S3 successfully: ${s3Key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${s3Key}`, error);
      throw error;
    }
  }
}