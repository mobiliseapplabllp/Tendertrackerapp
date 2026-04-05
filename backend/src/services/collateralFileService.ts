import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Request } from 'express';
import multer from 'multer';
import logger from '../utils/logger';

const MATERIALS_DIR = process.env.MATERIALS_DIR || './materials';
const MAX_MATERIAL_SIZE = parseInt(process.env.MAX_MATERIAL_SIZE_MB || '100') * 1024 * 1024; // 100MB default for videos

// Ensure materials directory exists
if (!fs.existsSync(MATERIALS_DIR)) {
  fs.mkdirSync(MATERIALS_DIR, { recursive: true });
}

// Extended MIME types for marketing collateral
const ALLOWED_COLLATERAL_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
];

const COLLATERAL_EXTENSION_MAP: { [ext: string]: string } = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
};

/**
 * Get file type category based on MIME type
 */
export function getFileTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('zip')) return 'archive';
  return 'other';
}

/**
 * Validate collateral file upload
 */
export function validateCollateralUpload(file: Express.Multer.File): { isValid: boolean; error?: string } {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = ALLOWED_COLLATERAL_MIME_TYPES.includes(file.mimetype)
    ? file.mimetype
    : COLLATERAL_EXTENSION_MAP[extension];

  if (!mimeType) {
    return {
      isValid: false,
      error: `File type not allowed. Supported: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, JPG/PNG/GIF/WEBP/SVG, MP4/MOV/AVI/WEBM, ZIP`,
    };
  }

  if (file.size && file.size > MAX_MATERIAL_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_MATERIAL_SIZE / 1024 / 1024}MB limit.`,
    };
  }

  return { isValid: true };
}

/**
 * Generate unique file name for materials
 */
export function generateMaterialFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
}

/**
 * Configure multer storage for materials
 */
const materialsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, MATERIALS_DIR);
  },
  filename: (_req, file, cb) => {
    const fileName = generateMaterialFileName(file.originalname);
    cb(null, fileName);
  },
});

/**
 * File filter for collateral uploads
 */
const materialsFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const validation = validateCollateralUpload(file);
  if (validation.isValid) {
    cb(null, true);
  } else {
    cb(new Error(validation.error));
  }
};

/**
 * Multer upload middleware for materials
 */
export const materialsUpload = multer({
  storage: materialsStorage,
  fileFilter: materialsFileFilter,
  limits: {
    fileSize: MAX_MATERIAL_SIZE,
  },
});

/**
 * Delete material file from filesystem
 */
export async function deleteMaterialFile(fileName: string): Promise<void> {
  try {
    const fullPath = getMaterialFilePath(fileName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info({ message: 'Material file deleted', filePath: fullPath });
    }
  } catch (error: any) {
    logger.error({ message: 'Failed to delete material file', fileName, error: error.message });
    throw error;
  }
}

/**
 * Get material file path (with directory traversal protection)
 */
export function getMaterialFilePath(fileName: string): string {
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Invalid file path: directory traversal detected');
  }

  const sanitized = path.basename(fileName);
  const filePath = path.join(MATERIALS_DIR, sanitized);

  const resolved = path.resolve(filePath);
  const materialsDirResolved = path.resolve(MATERIALS_DIR);

  if (!resolved.startsWith(materialsDirResolved)) {
    throw new Error('Invalid file path: directory traversal detected');
  }

  return filePath;
}

/**
 * Get the materials directory path
 */
export function getMaterialsDir(): string {
  return MATERIALS_DIR;
}
