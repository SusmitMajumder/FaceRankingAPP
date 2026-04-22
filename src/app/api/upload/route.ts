import { NextRequest, NextResponse } from 'next/server';
import { uploadImage, getAllImages } from '@/lib/images';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subjectId = (formData.get('subjectId') as string)?.trim();
    const imageId = (formData.get('imageId') as string)?.trim();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!subjectId || !imageId) {
      return NextResponse.json(
        { error: 'Subject_ID and Image_ID are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, WebP, or GIF.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary with context metadata
    const filename = `${subjectId}_${imageId}_${Date.now()}`;
    const result = await uploadImage(file, filename, subjectId, imageId);

    return NextResponse.json({
      success: true,
      cloudinary: result,
      subjectId,
      imageId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const images = await getAllImages();
    return NextResponse.json({ images, total: images.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
