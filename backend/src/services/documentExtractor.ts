import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import logger from '../utils/logger';

export class DocumentExtractor {
  /**
   * Extract text from a document file
   */
  static async extractText(filePath: string, mimeType: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // PDF files
      if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await (pdfParse as any)(dataBuffer);
        return data.text || '';
      }

      // DOCX files
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value || '';
      }

      // DOC files (legacy Word format) - limited support
      if (mimeType === 'application/msword') {
        // DOC files are binary and harder to parse without additional libraries
        // For now, return a placeholder
        logger.warn({ message: 'DOC file format not fully supported for text extraction', filePath });
        return '[DOC file - content extraction not available]';
      }

      // Excel files - limited support
      if (
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        logger.warn({ message: 'Excel file format not supported for text extraction', filePath });
        return '[Excel file - content extraction not available]';
      }

      // Images - OCR would be needed
      if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
        logger.warn({ message: 'Image file format not supported for text extraction (OCR not implemented)', filePath });
        return '[Image file - OCR not available]';
      }

      return '';
    } catch (error: any) {
      logger.error({
        message: 'Failed to extract text from document',
        filePath,
        mimeType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Extract text from multiple documents
   */
  static async extractTextFromDocuments(
    documents: Array<{ filePath: string; mimeType: string; fileName: string }>
  ): Promise<Array<{ fileName: string; content: string }>> {
    const results: Array<{ fileName: string; content: string }> = [];

    for (const doc of documents) {
      try {
        const content = await this.extractText(doc.filePath, doc.mimeType);
        if (content && content.trim().length > 0) {
          results.push({
            fileName: doc.fileName,
            content: content.trim(),
          });
        }
      } catch (error: any) {
        logger.warn({
          message: 'Failed to extract text from document, skipping',
          fileName: doc.fileName,
          error: error.message,
        });
        // Continue with other documents even if one fails
      }
    }

    return results;
  }
}

