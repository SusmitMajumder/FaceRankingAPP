import { NextRequest, NextResponse } from 'next/server';
import { submitRating } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { raterId, subjectId, imageId, rating } = body;

    // Validate inputs
    if (!raterId || !subjectId || !imageId || rating === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: raterId, subjectId, imageId, rating' },
        { status: 400 }
      );
    }

    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      );
    }

    const result = await submitRating({
      raterId,
      subjectId,
      imageId,
      rating: ratingNum,
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}
