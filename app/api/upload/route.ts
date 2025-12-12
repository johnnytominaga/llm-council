/**
 * API endpoint for file uploads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import {
  uploadFileToS3,
  isSupportedFileType,
  validateFileSize,
} from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!isSupportedFileType(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Supported types: images (PNG, JPEG, WebP, GIF) and PDFs`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    const sizeValidation = validateFileSize(file.size, file.type);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const uploadedFile = await uploadFileToS3(
      buffer,
      file.name,
      file.type,
      userId
    );

    return NextResponse.json({
      success: true,
      file: uploadedFile,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
