// Image management using Cloudinary Admin API (Vercel-compatible, no database needed)
import { listImages as listFromCloudinary, uploadToCloudinary, deleteImage as deleteFromCloudinary, FaceImage, CloudinaryUploadResult } from './cloudinary';

export async function getAllImages(): Promise<FaceImage[]> {
  return listFromCloudinary();
}

export async function uploadImage(
  file: File,
  filename: string,
  subjectId: string,
  imageId: string
): Promise<CloudinaryUploadResult> {
  return uploadToCloudinary(file, filename, subjectId, imageId);
}

export async function deleteImage(publicId: string): Promise<boolean> {
  return deleteFromCloudinary(publicId);
}

export type { FaceImage };
