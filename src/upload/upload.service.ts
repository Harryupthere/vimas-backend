import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
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

  // Server-side upload of a buffer the backend already has in memory (e.g. a
  // generated PDF) — unlike generatePresignedUrl above, this never hands the
  // client an upload URL and never goes through CloudFront, so the object is
  // only ever reachable via generatePresignedGetUrl below or direct AWS
  // credentials. No ACL is set, so it inherits the bucket's default (private)
  // access — callers needing a public asset should keep using
  // generatePresignedUrl instead.
  async uploadPrivateBuffer(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  // Short-lived, read-only URL for an object uploaded via uploadPrivateBuffer
  // (or any other private key in the bucket) — the only way such an object
  // is ever meant to be reachable from outside AWS.
  //
  // `downloadFilename`, when given, sets Content-Disposition: attachment on
  // S3's response (an override S3 supports directly on the presigned URL,
  // no object metadata change needed) so the browser saves the file under
  // that name instead of navigating to/previewing it — used by the buyer
  // receipt-download endpoints. Left unset for admin's inline listings,
  // which keep today's open-in-browser behaviour.
  async generatePresignedGetUrl(
    key: string,
    expiresInSeconds: number,
    downloadFilename?: string,
  ): Promise<string> {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ...(downloadFilename && {
        ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
      }),
    });

    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}
