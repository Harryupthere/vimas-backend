import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;

  constructor() {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_IAM_USER_ACCESS_KEY;
    const secretAccessKey = process.env.AWS_IAM_USER_SECRET_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing AWS S3 environment variables');
    }

    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async generatePresignedUrl(filename: string, fileType: string) {
    const uniqueFilename = `${uuidv4()}-${filename}`;

    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFilename,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 60 * 5, // 5 minutes
    });

    const cloudFrontDomain = process.env.CLOUD_FRONT_DOMAIN;
    const fileUrl = `https://${cloudFrontDomain}/${uniqueFilename}`;

    return { uploadUrl, fileUrl };
  }
}
