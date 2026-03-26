/**
 * Client-side PDF text extraction using pdfjs-dist.
 * Extracts all text from a PDF File and returns it as a single string.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Serve the worker from public/ — avoids CDN/CORS issues and works offline.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  fileName: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_PAGES = 50;

/**
 * Extract all text content from a PDF file.
 * Throws on invalid/corrupt files, files exceeding 20 MB, or PDFs over 50 pages.
 */
export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('PDF is too large (max 20 MB).');
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are supported.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`This PDF has ${pdf.numPages} pages. For best results, please upload a PDF with 50 pages or fewer.`);
  }

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(pageText);
  }

  return {
    text: pages.join('\n\n'),
    pageCount: pdf.numPages,
    fileName: file.name,
  };
}
