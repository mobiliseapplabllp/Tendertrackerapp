/**
 * File Service Security Tests
 * Tests for file upload security, path traversal, and content validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateFileUpload, getFilePath, generateFileName } from '../services/fileService';
import { CustomError } from '../middleware/errorHandler';

describe('File Service Security Tests', () => {
  const testUploadDir = './test-uploads';

  beforeAll(() => {
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  describe('File Upload Validation', () => {
    it('should reject executable files', () => {
      const exeFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
        path: path.join(testUploadDir, 'test.exe'),
      } as Express.Multer.File;

      const result = validateFileUpload(exeFile);
      expect(result.isValid).toBe(false);
    });

    it('should reject files exceeding size limit', () => {
      const largeFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB
        path: path.join(testUploadDir, 'large.pdf'),
      } as Express.Multer.File;

      const result = validateFileUpload(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds');
    });

    it('should accept valid PDF files', () => {
      const pdfFile = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: path.join(testUploadDir, 'document.pdf'),
      } as Express.Multer.File;

      // Create a valid PDF file for testing
      const pdfContent = Buffer.from('%PDF-1.4\n');
      fs.writeFileSync(pdfFile.path, pdfContent);

      const result = validateFileUpload(pdfFile);
      expect(result.isValid).toBe(true);
    });

    it('should validate file content matches MIME type', () => {
      // Create a file with wrong extension
      const fakePdf = {
        originalname: 'fake.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: path.join(testUploadDir, 'fake.pdf'),
      } as Express.Multer.File;

      // Write non-PDF content
      fs.writeFileSync(fakePdf.path, Buffer.from('This is not a PDF'));

      const result = validateFileUpload(fakePdf);
      // Should fail content validation
      expect(result.isValid).toBe(false);
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal in file paths', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '/etc/passwd',
        'C:\\Windows\\System32',
        '....//....//etc/passwd',
      ];

      maliciousPaths.forEach(maliciousPath => {
        expect(() => {
          getFilePath(maliciousPath);
        }).toThrow('directory traversal');
      });
    });

    it('should reject filename with path traversal characters', () => {
      expect(() => {
        getFilePath('../../../etc/passwd');
      }).toThrow('directory traversal');
    });

    it('should generate safe filenames', () => {
      const maliciousNames = [
        '../../../etc/passwd',
        'file<script>.pdf',
        'file"quotes".pdf',
        'file:colon.pdf',
      ];

      maliciousNames.forEach(name => {
        const generated = generateFileName(name);
        expect(generated).not.toContain('../');
        expect(generated).not.toContain('<');
        expect(generated).not.toContain('>');
        expect(generated).not.toContain('"');
        expect(generated).not.toContain(':');
      });
    });
  });

  describe('File Type Validation', () => {
    const allowedTypes = [
      { name: 'PDF', mimetype: 'application/pdf', ext: '.pdf' },
      { name: 'DOC', mimetype: 'application/msword', ext: '.doc' },
      { name: 'DOCX', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx' },
      { name: 'XLS', mimetype: 'application/vnd.ms-excel', ext: '.xls' },
      { name: 'XLSX', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: '.xlsx' },
      { name: 'JPEG', mimetype: 'image/jpeg', ext: '.jpg' },
      { name: 'PNG', mimetype: 'image/png', ext: '.png' },
    ];

    allowedTypes.forEach(({ name, mimetype, ext }) => {
      it(`should accept ${name} files`, () => {
        const file = {
          originalname: `test${ext}`,
          mimetype,
          size: 1024,
          path: path.join(testUploadDir, `test${ext}`),
        } as Express.Multer.File;

        // Create valid file content
        if (mimetype === 'application/pdf') {
          fs.writeFileSync(file.path, Buffer.from('%PDF-1.4\n'));
        } else {
          fs.writeFileSync(file.path, Buffer.from('test content'));
        }

        const result = validateFileUpload(file);
        expect(result.isValid).toBe(true);
      });
    });

    const blockedTypes = [
      { name: 'EXE', mimetype: 'application/x-msdownload', ext: '.exe' },
      { name: 'BAT', mimetype: 'application/x-msdos-program', ext: '.bat' },
      { name: 'SH', mimetype: 'application/x-sh', ext: '.sh' },
      { name: 'PHP', mimetype: 'application/x-php', ext: '.php' },
      { name: 'JS', mimetype: 'application/javascript', ext: '.js' },
    ];

    blockedTypes.forEach(({ name, mimetype, ext }) => {
      it(`should reject ${name} files`, () => {
        const file = {
          originalname: `malicious${ext}`,
          mimetype,
          size: 1024,
          path: path.join(testUploadDir, `malicious${ext}`),
        } as Express.Multer.File;

        const result = validateFileUpload(file);
        expect(result.isValid).toBe(false);
      });
    });
  });
});


