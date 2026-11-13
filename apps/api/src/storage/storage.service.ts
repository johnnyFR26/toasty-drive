import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService implements OnModuleInit {
  private s3: S3Client;
  private bucket: string;
  private presignedUrlExpiry: number;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.bucket = this.config.get<string>('aws.s3.bucket');
    this.presignedUrlExpiry = this.config.get<number>('aws.s3.presignedUrlExpiry');

    this.s3 = new S3Client({
      region: this.config.get<string>('aws.region'),
      ...(this.config.get<string>('aws.s3.endpoint') && {
        endpoint: this.config.get<string>('aws.s3.endpoint'),
        forcePathStyle: true,
      }),
    });
  }

  /**
   * Generate a presigned URL for uploading a file to S3.
   */
  async getUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.s3, command, { expiresIn: this.presignedUrlExpiry });
  }

  /**
   * Generate a presigned URL for downloading a file from S3.
   */
  async getDownloadUrl(key: string, fileName?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(fileName && {
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
      }),
    });

    return getSignedUrl(this.s3, command, { expiresIn: this.presignedUrlExpiry });
  }

  /**
   * Delete an object from S3.
   */
  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /**
   * Check if an object exists in S3.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
