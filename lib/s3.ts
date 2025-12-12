/**
 * S3 utility functions for file uploads and management.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;
const UPLOAD_PREFIX = process.env.AWS_S3_UPLOAD_PREFIX || 'uploads/';
const SIGNED_URL_EXPIRATION = parseInt(
  process.env.AWS_S3_SIGNED_URL_EXPIRATION || '3600'
);

export interface UploadedFile {
  key: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
}

/**
 * Upload a file to S3.
 */
export async function uploadFileToS3(
  file: Buffer,
  filename: string,
  contentType: string,
  userId: string
): Promise<UploadedFile> {
  // Generate unique key with user ID scoping
  const fileExtension = filename.split('.').pop();
  const uniqueId = nanoid();
  const key = `${UPLOAD_PREFIX}${userId}/${uniqueId}.${fileExtension}`;

  // Upload to S3 with public-read ACL so OpenRouter can access it
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read',
      Metadata: {
        originalFilename: filename,
        userId,
      },
    })
  );

  // Generate public URL (no signature needed since object is public-read)
  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    key,
    url,
    filename,
    contentType,
    size: file.length,
  };
}

/**
 * Delete a file from S3.
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Generate a new signed URL for an existing S3 object.
 */
export async function getFileSignedUrl(key: string): Promise<string> {
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: SIGNED_URL_EXPIRATION }
  );

  return url;
}

/**
 * Check if a file type is supported.
 */
export function isSupportedFileType(contentType: string): boolean {
  const supportedTypes = [
    // Images
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    // PDFs
    'application/pdf',
  ];

  return supportedTypes.includes(contentType);
}

/**
 * Get file type category (image or pdf).
 */
export function getFileTypeCategory(
  contentType: string
): 'image' | 'pdf' | 'unknown' {
  if (contentType.startsWith('image/')) {
    return 'image';
  }
  if (contentType === 'application/pdf') {
    return 'pdf';
  }
  return 'unknown';
}

/**
 * Validate file size (max 10MB for images, 50MB for PDFs).
 */
export function validateFileSize(
  size: number,
  contentType: string
): { valid: boolean; error?: string } {
  const category = getFileTypeCategory(contentType);

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

  if (category === 'image' && size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: 'Image size must be less than 10MB',
    };
  }

  if (category === 'pdf' && size > MAX_PDF_SIZE) {
    return {
      valid: false,
      error: 'PDF size must be less than 50MB',
    };
  }

  return { valid: true };
}
