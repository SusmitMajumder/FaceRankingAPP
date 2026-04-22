import { NextRequest, NextResponse } from 'next/server';
import { getAllImages, deleteImage } from '@/lib/images';

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('id');

    if (!publicId) {
      return NextResponse.json({ error: 'Image public_id is required' }, { status: 400 });
    }

    const success = await deleteImage(publicId);
    if (success) {
      return NextResponse.json({ success: true, message: 'Image deleted from Cloudinary' });
    } else {
      return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
