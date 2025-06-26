import { FileValidator } from '@nestjs/common';
import type { Express } from 'express';

const allowedExtensions = [
  'webp',
  'png',
  'jpeg',
  'jpg',
  'gif',
  'bmp',
  'svg',
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'mkv',
  'webm',
  'ogg',
];
const allowedMimeTypes = [
  'image/webp',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/flv',
  'video/mkv',
  'video/webm',
  'video/ogg',
];

export class FileMimeExtValidator extends FileValidator<Record<string, any>> {
  constructor(validationOptions?: Record<string, any>) {
    super(validationOptions ?? {}); // 부모 생성자에 넘겨주기
  }

  isValid(file?: Express.Multer.File): boolean | Promise<boolean> {
    if (!file) return false;
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) return false;
    if (!allowedMimeTypes.includes(file.mimetype)) return false;
    return true;
  }

  buildErrorMessage(file: any): string {
    return `허용되지 않는 파일 형식 또는 확장자입니다. (확장자: ${file?.originalname}, MIME: ${file?.mimetype})`;
  }
}
