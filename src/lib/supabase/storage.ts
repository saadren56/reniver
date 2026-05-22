'use client';

import { createClient } from './client';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip'
];

export const uploadFile = async (
  file: File,
  bucket: 'avatars' | 'media',
  userId: string
): Promise<string> => {
  const supabase = createClient();

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 10MB');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file);

  if (error) {
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return publicUrl;
};

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPG, PNG, GIF, and WebP images are allowed');
  }
  return uploadFile(file, 'avatars', userId);
};

export const uploadMedia = async (file: File, userId: string): Promise<string> => {
  const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_FILE_TYPES];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not supported');
  }
  return uploadFile(file, 'media', userId);
};
