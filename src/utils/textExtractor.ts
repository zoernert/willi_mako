import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
const mammoth = require('mammoth');

interface TextExtractor {
  extract(filePath: string): Promise<string>;
}

class PlainTextExtractor implements TextExtractor {
  async extract(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }
}

class PdfExtractor implements TextExtractor {
  async extract(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error(`Error extracting text from PDF ${path.basename(filePath)}:`, error);
      return `[Error extracting PDF content from ${path.basename(filePath)}]`;
    }
  }
}

class DocxExtractor implements TextExtractor {
  async extract(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value;
    } catch (error) {
      console.error(`Error extracting text from DOCX ${path.basename(filePath)}:`, error);
      return `[Error extracting DOCX content from ${path.basename(filePath)}]`;
    }
  }
}

class DefaultExtractor implements TextExtractor {
    async extract(filePath: string): Promise<string> {
        console.warn(`No specific extractor for this file type. Reading as plain text: ${path.basename(filePath)}.`);
        return fs.readFile(filePath, 'utf-8');
    }
}

export function getTextExtractor(mimeType: string): TextExtractor {
  if (mimeType === 'application/pdf') {
    return new PdfExtractor();
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return new DocxExtractor();
  }
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return new PlainTextExtractor();
  }
  return new DefaultExtractor();
}
