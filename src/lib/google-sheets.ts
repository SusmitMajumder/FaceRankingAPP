const GOOGLE_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;

export interface RatingSubmission {
  raterId: string;
  subjectId: string;
  imageId: string;
  rating: number;
  timestamp?: string;
}

export async function submitRating(data: RatingSubmission): Promise<{ success: boolean; message: string }> {
  const payload = {
    Rater_ID: data.raterId,
    Subject_ID: data.subjectId,
    Image_ID: data.imageId,
    Rating: data.rating,
    Timestamp: data.timestamp || new Date().toISOString(),
  };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL || '', {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script requires no-cors for cross-origin
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // With no-cors, we can't read the response, but if no error is thrown, it likely worked
    return {
      success: true,
      message: 'Rating submitted successfully',
    };
  } catch (error) {
    console.error('Google Sheets submission error:', error);
    return {
      success: false,
      message: 'Failed to submit rating. Please try again.',
    };
  }
}

export async function submitRatingDirect(data: RatingSubmission): Promise<{ success: boolean; message: string }> {
  const payload = {
    Rater_ID: data.raterId,
    Subject_ID: data.subjectId,
    Image_ID: data.imageId,
    Rating: data.rating,
    Timestamp: data.timestamp || new Date().toISOString(),
  };

  try {
    // Using GET with query params as fallback for Google Apps Script
    const params = new URLSearchParams();
    params.append('Rater_ID', payload.Rater_ID);
    params.append('Subject_ID', payload.Subject_ID);
    params.append('Image_ID', payload.Image_ID);
    params.append('Rating', String(payload.Rating));
    params.append('Timestamp', payload.Timestamp);

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'no-cors',
    });

    return {
      success: true,
      message: 'Rating submitted successfully',
    };
  } catch (error) {
    console.error('Google Sheets submission error:', error);
    return {
      success: false,
      message: 'Failed to submit rating. Please try again.',
    };
  }
}
