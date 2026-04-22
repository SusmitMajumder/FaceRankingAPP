import crypto from 'crypto';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

/* ─── Types ─── */
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  url: string;
  context?: { custom?: Record<string, string> };
}

export interface FaceImage {
  id: string;             // public_id (used as unique id)
  subjectId: string;
  imageId: string;
  cloudinaryUrl: string;
  publicId: string;
  createdAt: string;
}

/* ─── Signature Generation ─── */
function generateSignature(paramsToSign: string): string {
  return crypto
    .createHash('sha1')
    .update(paramsToSign + API_SECRET)
    .digest('hex');
}

/* ─── Upload (unsigned) with context metadata ─── */
export async function uploadToCloudinary(
  file: File | Buffer,
  filename: string,
  subjectId: string,
  imageId: string
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();

  if (file instanceof File) {
    formData.append('file', file);
  } else {
    const blob = new Blob([file], { type: 'image/jpeg' });
    formData.append('file', blob, filename);
  }

  formData.append('upload_preset', UPLOAD_PRESET || 'face_rank_upload');
  formData.append('folder', 'face-ranking');

  // Store subjectId and imageId in Cloudinary context
  formData.append('context', `subjectId=${subjectId}|imageId=${imageId}`);

  // Also store as tags for easier querying
  formData.append('tags', `face-ranking,${subjectId},${imageId}`);

  const response = await fetch(`${CLOUDINARY_URL}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudinary upload failed: ${error}`);
  }

  return response.json();
}

/* ─── List Images (signed Admin API) ─── */
export async function listImages(): Promise<FaceImage[]> {
  if (!API_KEY || !API_SECRET) {
    console.error('Cloudinary API key/secret not configured');
    return [];
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(`timestamp=${timestamp}`);

  const params = new URLSearchParams({
    prefix: 'face-ranking',
    type: 'upload',
    max_results: '500',
    direction: 'asc',
  });

  const url = `${CLOUDINARY_URL}/resources/image/upload?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${API_KEY}:${signature}`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Cloudinary list failed:', error);
    return [];
  }

  const data = await response.json();
  const resources = data.resources || [];

  return resources
    .map((r: Record<string, unknown>) => {
      const context = r.context as { custom?: Record<string, string> } | undefined;
      const subjectId = context?.custom?.subjectId || 'Unknown';
      const imageId = context?.custom?.imageId || 'Unknown';

      return {
        id: r.public_id as string,
        subjectId,
        imageId,
        cloudinaryUrl: r.secure_url as string,
        publicId: r.public_id as string,
        createdAt: r.created_at as string,
      };
    })
    .sort((a: FaceImage, b: FaceImage) => {
      const subCompare = a.subjectId.localeCompare(b.subjectId);
      if (subCompare !== 0) return subCompare;
      return a.imageId.localeCompare(b.imageId, undefined, { numeric: true });
    });
}

/* ─── Delete Image (signed Admin API) ─── */
export async function deleteImage(publicId: string): Promise<boolean> {
  if (!API_KEY || !API_SECRET) {
    console.error('Cloudinary API key/secret not configured');
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(`timestamp=${timestamp}&public_id=${publicId}`);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('api_key', API_KEY);

  const response = await fetch(`${CLOUDINARY_URL}/resources/image/destroy`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data.result === 'ok';
}

/* ─── Get Image URL ─── */
export function getCloudinaryImageUrl(publicId: string, transformations?: string): string {
  const base = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
  if (transformations) {
    return `${base}/${transformations}/${publicId}`;
  }
  return `${base}/${publicId}`;
}
