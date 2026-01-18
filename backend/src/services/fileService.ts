import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Request } from 'express';
import multer from 'multer';
import logger from '../utils/logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024; // Convert to bytes

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-excel.addin.macroEnabled.12',
  'application/vnd.ms-excel.template.macroEnabled.12',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
];

const EXTENSION_MIME_MAP: { [ext: string]: string } = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pjpeg': 'image/pjpeg',
  '.png': 'image/png',
};

// File magic bytes (first few bytes) for content validation
const FILE_SIGNATURES: { [key: string]: Buffer[] } = {
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  'application/msword': [Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])], // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    Buffer.from('PK\x03\x04'), // ZIP signature (DOCX is a ZIP)
  ],
  'application/vnd.ms-excel': [Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])], // XLS
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    Buffer.from('PK\x03\x04'), // ZIP signature (XLSX is a ZIP)
  ],
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/pjpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
};

const SKIP_SIGNATURE_ON_MISMATCH = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
]);

const WHITESPACE_BYTES = new Set<number>([
  0x09, // horizontal tab
  0x0a, // line feed
  0x0b, // vertical tab
  0x0c, // form feed
  0x0d, // carriage return
  0x20, // space
]);

function stripLeadingWhitespace(buffer: Buffer): Buffer {
  let idx = 0;
  const length = buffer.length;

  while (idx < length && WHITESPACE_BYTES.has(buffer[idx])) {
    idx++;
  }

  // Remove UTF-8 BOM if present
  if (idx + 3 <= length && buffer[idx] === 0xef && buffer[idx + 1] === 0xbb && buffer[idx + 2] === 0xbf) {
    idx += 3;
  }

  return buffer.slice(idx);
}

/**
 * Validate file content by checking magic bytes
 */
function validateFileContent(filePath: string, expectedMimeType: string): boolean {
  try {
    const signatures = FILE_SIGNATURES[expectedMimeType];
    if (!signatures) {
      // If no signature defined, skip content validation (fallback)
      return true;
    }

    const fileBuffer = fs.readFileSync(filePath);
    if (fileBuffer.length === 0) {
      return false;
    }

    const normalizedBuffer = stripLeadingWhitespace(fileBuffer);

    // Check if file starts with any of the expected signatures
    const matchesSignature = signatures.some(signature => {
      if (normalizedBuffer.length < signature.length) {
        return false;
      }
      return signature.equals(normalizedBuffer.slice(0, signature.length));
    });

    if (!matchesSignature && SKIP_SIGNATURE_ON_MISMATCH.has(expectedMimeType)) {
      logger.warn({
        message: 'File signature mismatch ignored based on allowed MIME type',
        filePath,
        expectedMimeType,
        sample: normalizedBuffer.slice(0, 8).toString('hex'),
      });
      return true;
    }

    return matchesSignature;
  } catch (error) {
    logger.error({ message: 'Error validating file content', error, filePath });
    return false;
  }
}

// Note: Path sanitization is handled in getFilePath() function

/**
 * Validate file upload
 */
export function validateFileUpload(file: Express.Multer.File): { isValid: boolean; error?: string } {
  // Check file type
  const extension = path.extname(file.originalname).toLowerCase();
  const expectedMimeType = ALLOWED_MIME_TYPES.includes(file.mimetype)
    ? file.mimetype
    : EXTENSION_MIME_MAP[extension];

  if (!expectedMimeType) {
    return {
      isValid: false,
      error: 'File type not allowed. Only PDF, DOC, DOCX, XLS, XLSX, JPG/JPEG, PNG are permitted.',
    };
  }

  // Check file size
  if (file.size && file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`,
    };
  }

  // Validate file content (magic bytes)
  if (file.path && !validateFileContent(file.path, expectedMimeType)) {
    return {
      isValid: false,
      error: 'File content does not match declared file type. File may be corrupted or malicious.',
    };
  }

  return { isValid: true };
}

/**
 * Generate file hash
 */
export async function generateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Generate unique file name
 */
export function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
}

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  },
});

/**
 * File filter
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const validation = validateFileUpload(file);
  if (validation.isValid) {
    cb(null, true);
  } else {
    cb(new Error(validation.error));
  }
};

/**
 * Multer upload middleware
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Delete file from filesystem (with path traversal protection)
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    // Use getFilePath to ensure path is sanitized
    const fullPath = getFilePath(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info({ message: 'File deleted', filePath: fullPath });
    }
  } catch (error: any) {
    logger.error({ message: 'Failed to delete file', filePath, error: error.message });
    throw error;
  }
}

/**
 * Get file path (with directory traversal protection)
 */
export function getFilePath(fileName: string): string {
  // STRICT VALIDATION: Reject any directory traversal attempts immediately
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Invalid file path: directory traversal detected');
  }

  // Sanitize filename to prevent directory traversal (redundant but safe)
  const sanitized = path.basename(fileName);
  const filePath = path.join(UPLOAD_DIR, sanitized);

  // Additional validation: ensure path is within upload directory
  const resolved = path.resolve(filePath);
  const uploadDirResolved = path.resolve(UPLOAD_DIR);

  if (!resolved.startsWith(uploadDirResolved)) {
    throw new Error('Invalid file path: directory traversal detected');
  }

  return filePath;
}

