"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextExtractor = getTextExtractor;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth = require('mammoth');
class PlainTextExtractor {
    async extract(filePath) {
        return promises_1.default.readFile(filePath, 'utf-8');
    }
}
class PdfExtractor {
    async extract(filePath) {
        try {
            const dataBuffer = await promises_1.default.readFile(filePath);
            const data = await (0, pdf_parse_1.default)(dataBuffer);
            return data.text;
        }
        catch (error) {
            console.error(`Error extracting text from PDF ${path_1.default.basename(filePath)}:`, error);
            return `[Error extracting PDF content from ${path_1.default.basename(filePath)}]`;
        }
    }
}
class DocxExtractor {
    async extract(filePath) {
        try {
            const dataBuffer = await promises_1.default.readFile(filePath);
            const result = await mammoth.extractRawText({ buffer: dataBuffer });
            return result.value;
        }
        catch (error) {
            console.error(`Error extracting text from DOCX ${path_1.default.basename(filePath)}:`, error);
            return `[Error extracting DOCX content from ${path_1.default.basename(filePath)}]`;
        }
    }
}
class DefaultExtractor {
    async extract(filePath) {
        console.warn(`No specific extractor for this file type. Reading as plain text: ${path_1.default.basename(filePath)}.`);
        return promises_1.default.readFile(filePath, 'utf-8');
    }
}
function getTextExtractor(mimeType) {
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
//# sourceMappingURL=textExtractor.js.map