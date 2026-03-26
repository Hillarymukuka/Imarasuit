import jsPDF from 'jspdf';

import autoTable from 'jspdf-autotable';

import {

  Document,

  CompanyProfile,

  Client,

  Quotation,

  Invoice,

  PurchaseOrder,

  DeliveryNote,

  PDFColor,

  PDFSettings,

  DocumentType,

  Letter

} from '@/types';

import { formatCurrency, formatDate } from '@/lib/utils';

import { DOCUMENT_TYPE_LABELS, PDF_COLOR_PRESETS, DEFAULT_PDF_SETTINGS, getCurrencyByCode } from '@/lib/constants';



interface GeneratePDFOptions {

  document: Document;

  company: CompanyProfile;

  client: Client;

  pdfSettings?: PDFSettings;

}



interface ColorScheme {

  primary: [number, number, number];

  dark: [number, number, number];

  accent: [number, number, number];

  textOnPrimary: [number, number, number];

  textOnDark: [number, number, number];

  textOnLight: [number, number, number];

  lightBg: [number, number, number];

  gray: [number, number, number];

}



// Calculate luminance to determine if color is light or dark

function getLuminance(r: number, g: number, b: number): number {

  const [rs, gs, bs] = [r, g, b].map(c => {

    c = c / 255;

    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;

}



// Determine best text color for background

function getContrastingTextColor(bgColor: [number, number, number]): [number, number, number] {

  const luminance = getLuminance(bgColor[0], bgColor[1], bgColor[2]);

  return luminance > 0.4 ? [30, 30, 30] : [255, 255, 255];

}



// Create a proper color scheme with contrasting text colors

function createColorScheme(primary: [number, number, number], dark: [number, number, number], accent: [number, number, number]): ColorScheme {

  return {

    primary,

    dark,

    accent,

    textOnPrimary: getContrastingTextColor(primary),

    textOnDark: getContrastingTextColor(dark),

    textOnLight: [30, 41, 59], // slate-800

    lightBg: [248, 250, 252], // slate-50

    gray: [100, 116, 139], // slate-500

  };

}



// Get logo dimensions AND resize to display size to keep PDF file small.

// The PDF displays logos at ~28-48mm. Embedding the original (potentially thousands of

// pixels wide) blows up file size to 22MB+. We resize to 3× the display size in pixels

// (enough for crisp print quality) and re-encode as JPEG at 0.85 quality.

function getLogoDimensions(

  logoDataUrl: string,

  maxWidth: number,

  maxHeight: number

): Promise<{ width: number; height: number; dataUrl: string; format: 'PNG' }> {

  return new Promise((resolve) => {

    const img = new Image();

    img.onload = () => {

      // 1. Calculate display dimensions (mm) maintaining aspect ratio

      let width = img.naturalWidth || img.width;

      let height = img.naturalHeight || img.height;

      const ratio = Math.min(maxWidth / width, maxHeight / height);

      if (ratio < 1) { width = width * ratio; height = height * ratio; }



      // 2. Resize image to 3× display size in PDF points (72 dpi → 1mm = ~2.83pt)

      //    3× gives sharp rendering even for high-quality print; capped at original size.

      const mmToPx = 72 / 25.4; // PDF points per mm

      const scale = 3;

      const targetW = Math.min(Math.round(width * mmToPx * scale), img.naturalWidth || img.width);

      const targetH = Math.min(Math.round(height * mmToPx * scale), img.naturalHeight || img.height);



      // 3. Draw onto a small canvas and export as PNG to preserve transparency

      try {

        const canvas = document.createElement('canvas');

        canvas.width = targetW;

        canvas.height = targetH;

        const ctx = canvas.getContext('2d');

        if (!ctx) { resolve({ width, height, dataUrl: logoDataUrl, format: 'PNG' }); return; }



        // Do NOT fill background  keep alpha channel intact for transparent PNGs

        ctx.drawImage(img, 0, 0, targetW, targetH);



        const resized = canvas.toDataURL('image/png');

        resolve({ width, height, dataUrl: resized, format: 'PNG' });

      } catch {

        resolve({ width, height, dataUrl: logoDataUrl, format: 'PNG' });

      }

    };

    img.onerror = () => resolve({ width: maxWidth * 0.8, height: maxHeight * 0.8, dataUrl: logoDataUrl, format: 'PNG' });

    img.src = logoDataUrl;

  });

}



// Get active color from settings

function getActiveColor(settings: PDFSettings): PDFColor {

  const preset = PDF_COLOR_PRESETS.find(c => c.id === settings.selectedColorId);

  if (preset) return preset;

  const custom = settings.customColors.find(c => c.id === settings.selectedColorId);

  if (custom) return custom;

  return PDF_COLOR_PRESETS[0];

}



// Helper to create text function

function createTextHelper(pdf: jsPDF, defaultColor: [number, number, number]) {

  return (

    text: string,

    x: number,

    y: number,

    opts?: { fontSize?: number; fontStyle?: string; color?: [number, number, number]; align?: 'left' | 'center' | 'right'; font?: string }

  ) => {

    const { fontSize = 10, fontStyle = 'normal', color = defaultColor, align = 'left', font = 'helvetica' } = opts || {};

    pdf.setFontSize(fontSize);

    pdf.setFont(font, fontStyle);

    pdf.setTextColor(...color);

    pdf.text(text, x, y, { align });

  };

}



// =====================================================

// QUOTATION TEMPLATE - Clean professional style (like reference)

// =====================================================

async function generateQuotationPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 15;

  let yPos = 15;



  const addText = createTextHelper(pdf, colors.textOnLight);



  // Title "Quotation" centered at top

  addText('Quotation', pageWidth / 2, yPos, { fontSize: 24, fontStyle: 'bold', color: colors.primary, align: 'center' });



  yPos = 30;



  // Company name on left (left-aligned)

  addText(company.name.toUpperCase(), margin, yPos, { fontSize: 16, fontStyle: 'bold' });



  // Logo below company name (increased size)

  const logoSizes = { small: 28, medium: 38, large: 48 };

  const logoMaxSize = logoSizes[settings.logoSize];

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);

      pdf.addImage(dims.dataUrl, dims.format, margin, yPos + 8, dims.width, dims.height);

    } catch { }

  }



  // Quotation # and Date on right (moved up, above the address boxes)

  addText('Quotation#', pageWidth - margin - 50, yPos, { fontSize: 9, color: colors.gray });

  addText(document.documentNumber, pageWidth - margin, yPos, { fontSize: 10, fontStyle: 'bold', align: 'right' });

  addText('Quotation Date', pageWidth - margin - 50, yPos + 8, { fontSize: 9, color: colors.gray });

  addText(formatDate(document.dateIssued), pageWidth - margin, yPos + 8, { fontSize: 10, fontStyle: 'bold', align: 'right' });



  yPos = 75;



  // Two sections side by side - Quotation by (left) and Quotation to (right)

  // No background or border - clean look

  const boxWidth = (pageWidth - 2 * margin - 20) / 2;



  // Left section - Quotation by (Company)

  addText('Quotation by', margin, yPos, { fontSize: 10, fontStyle: 'bold', color: colors.primary });

  addText(company.name, margin, yPos + 8, { fontSize: 10, fontStyle: 'bold' });

  addText(company.address.street, margin, yPos + 15, { fontSize: 8, color: colors.gray });

  addText(`${company.address.city}, ${company.address.state}`, margin, yPos + 21, { fontSize: 8, color: colors.gray });

  addText(`${company.address.country} - ${company.address.postalCode}`, margin, yPos + 27, { fontSize: 8, color: colors.gray });



  // Tax IDs if available

  if (company.tin) {

    addText(`Tax ID: ${company.tin}`, margin, yPos + 36, { fontSize: 8, color: colors.gray });

  }



  // Right section - Quotation to (Client)

  const rightBoxX = pageWidth / 2 + 10;

  addText('Quotation to', rightBoxX, yPos, { fontSize: 10, fontStyle: 'bold', color: colors.primary });

  // Wrap long client names within the right box
  let rightY = yPos + 8;
  const clientNameMaxWR = pageWidth - margin - rightBoxX;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesR = pdf.splitTextToSize(client.name, clientNameMaxWR) as string[];
  clientNameLinesR.forEach((line, i) => { pdf.text(line, rightBoxX, rightY + i * 6); });
  rightY += clientNameLinesR.length * 6 + 1;

  addText(client.address.street, rightBoxX, rightY, { fontSize: 8, color: colors.gray }); rightY += 5;

  addText(`${client.address.city}, ${client.address.state}`, rightBoxX, rightY, { fontSize: 8, color: colors.gray }); rightY += 5;

  addText(`${client.address.country} - ${client.address.postalCode}`, rightBoxX, rightY, { fontSize: 8, color: colors.gray }); rightY += 5;



  if (client.tin) {

    addText(`Tax ID: ${client.tin}`, rightBoxX, rightY, { fontSize: 8, color: colors.gray });

  }



  yPos = 125;



  // Place of Supply row

  pdf.setFillColor(248, 250, 252);

  pdf.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');

  addText('Place of Supply', margin + 8, yPos + 7, { fontSize: 8, color: colors.gray });

  addText(company.address.state || 'N/A', margin + 55, yPos + 7, { fontSize: 9, fontStyle: 'bold' });

  addText('Country of Supply', pageWidth / 2 + 10, yPos + 7, { fontSize: 8, color: colors.gray });

  addText(company.address.country || 'N/A', pageWidth - margin - 8, yPos + 7, { fontSize: 9, fontStyle: 'bold', align: 'right' });



  yPos = 140;



  // Items table with colored header

  const tableHeaders = ['Item #/Item description', 'Qty.', 'Rate', 'Amount'];

  const tableData = document.items.map((item, i) => [

    `${i + 1}. ${item.name}${item.description ? `\n    ${item.description}` : ''}`,

    item.quantity.toString(),

    formatCurrency(item.unitPrice),

    formatCurrency(item.total),

  ]);



  autoTable(pdf, {

    head: [tableHeaders],

    body: tableData,

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: {

      fillColor: colors.primary, // Solid primary color

      textColor: [255, 255, 255], // White text

      fontStyle: 'bold',

      fontSize: 9,

      lineColor: colors.primary,

      lineWidth: 0.3,

    },

    bodyStyles: {

      fontSize: 9,

      textColor: colors.textOnLight,

      cellPadding: 5,

    },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: {

      lineColor: [230, 230, 230],

      lineWidth: 0.2,

    },

    columnStyles: {

      0: { cellWidth: 'auto', halign: 'left' },

      1: { cellWidth: 25, halign: 'center' },

      2: { cellWidth: 35, halign: 'right' },

      3: { cellWidth: 40, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;



  // Two column layout: Terms on left, Totals on right

  const leftColWidth = (pageWidth - 2 * margin) * 0.55;

  const rightColWidth = (pageWidth - 2 * margin) * 0.42;

  const rightColX = margin + leftColWidth + 5;



  // Page margin - leave space for page numbers

  const pageBottomMargin = 20;

  const maxContentY = pageHeight - pageBottomMargin;



  // Terms and Conditions on left

  let termsEndY = yPos;

  if (settings.showTerms && document.terms) {

    addText('Terms and Conditions', margin, yPos, { fontSize: 11, fontStyle: 'bold', color: colors.primary });

    yPos += 6;



    // Parse terms as numbered list if contains newlines

    const termsLines = document.terms.split('\n').filter(line => line.trim());

    let termY = yPos;

    termsLines.forEach((term, i) => {

      const wrappedLines = pdf.splitTextToSize(`${i + 1}. ${term.replace(/^\d+\.\s*/, '')}`, leftColWidth - 10);

      pdf.setFontSize(8);

      pdf.setTextColor(...colors.textOnLight);

      pdf.text(wrappedLines, margin + 3, termY);

      termY += wrappedLines.length * 4 + 2;

    });

    termsEndY = termY;

  }



  // Totals on right side

  let totalsY = yPos - 6;



  // Sub Total

  addText('Sub Total', rightColX, totalsY, { fontSize: 10 });

  addText(formatCurrency(document.subtotal), pageWidth - margin, totalsY, { fontSize: 10, align: 'right' });

  totalsY += 10;



  // Tax if applicable

  if (document.taxType !== 'none' && document.taxPercent > 0) {

    const taxLabel = document.taxType === 'vat' ? `VAT (${document.taxPercent}%)` : `TOT (${document.taxPercent}%)`;

    addText(taxLabel, rightColX, totalsY, { fontSize: 10 });

    addText(formatCurrency(document.taxTotal), pageWidth - margin, totalsY, { fontSize: 10, align: 'right' });

    totalsY += 10;

  }



  // Discount if applicable

  if (document.discount > 0) {

    const discountLabel = document.discountType === 'percentage'

      ? `Discount(${document.discount}%)`

      : 'Discount';

    const discAmt = document.discountType === 'percentage'

      ? (document.subtotal) * (document.discount / 100)

      : document.discount;



    addText(discountLabel, rightColX, totalsY, { fontSize: 10, color: [34, 197, 94] });

    addText(`- ${formatCurrency(discAmt)}`, pageWidth - margin, totalsY, { fontSize: 10, color: [34, 197, 94], align: 'right' });

    totalsY += 12;

  }



  // Total with line above

  pdf.setDrawColor(200, 200, 200);

  pdf.setLineWidth(0.3);

  pdf.line(rightColX, totalsY - 2, pageWidth - margin, totalsY - 2);



  addText('Total', rightColX, totalsY + 5, { fontSize: 12 });

  addText(formatCurrency(document.grandTotal), pageWidth - margin, totalsY + 5, { fontSize: 16, fontStyle: 'bold', align: 'right' });

  totalsY += 18;



  // Total in words - with proper wrapping within bounds

  addText('Quotation Total (in words)', rightColX, totalsY, { fontSize: 8, color: colors.gray });

  totalsY += 5;

  const totalInWords = numberToWords(document.grandTotal);

  // Limit width to fit within the right column bounds

  const maxWordsWidth = rightColWidth - 5;

  const wordsLines = pdf.splitTextToSize(totalInWords, maxWordsWidth);

  pdf.setFontSize(8);

  pdf.setTextColor(...colors.textOnLight);

  pdf.setFont('helvetica', 'bold');

  pdf.text(wordsLines, rightColX, totalsY);



  // Track the bottom of totals section

  const totalsEndY = totalsY + (wordsLines.length * 4);



  // Calculate where additional notes would go

  let notesEndY = termsEndY;

  const notesLines = document.notes ? pdf.splitTextToSize(document.notes, leftColWidth - 10) : [];

  const notesHeight = notesLines.length * 4 + 15;



  // Calculate footer height needed

  const footerHeight = 25;



  // Determine content end position

  let contentEndY = Math.max(termsEndY, totalsEndY);



  // Check if notes would overflow the page

  let notesStartY = termsEndY + 10;

  if (settings.showTerms && document.notes) {

    // If notes would go beyond page bounds, add a new page

    if (notesStartY + notesHeight > maxContentY) {

      pdf.addPage();

      notesStartY = margin;

    }



    addText('Additional Notes', margin, notesStartY, { fontSize: 11, fontStyle: 'bold', color: colors.primary });

    pdf.setFontSize(8);

    pdf.setTextColor(...colors.gray);

    pdf.setFont('helvetica', 'normal');

    pdf.text(notesLines, margin, notesStartY + 8);

    notesEndY = notesStartY + 8 + (notesLines.length * 4);

    contentEndY = notesEndY;

  }



  // Check if footer would overflow - if so, add new page for footer

  let footerStartY = contentEndY + 15;

  if (footerStartY + footerHeight > maxContentY) {

    pdf.addPage();

    footerStartY = margin;

  }



  // Contact info at bottom left

  addText(`For any enquiries, email us on ${company.email} or`, margin, footerStartY, { fontSize: 8, color: colors.primary });

  addText(`call us on ${company.phone}`, margin, footerStartY + 5, { fontSize: 8, color: colors.primary });

  addText('Thank you for your business!', margin, footerStartY + 12, { fontSize: 8, color: colors.gray, fontStyle: 'italic' });



  // Signature area at bottom right

  addText('Authorized Signature', pageWidth - margin - 40, footerStartY + 12, { fontSize: 8, color: colors.gray });



  // Signature line

  pdf.setDrawColor(...colors.gray);

  pdf.setLineWidth(0.3);

  pdf.line(pageWidth - margin - 60, footerStartY + 7, pageWidth - margin, footerStartY + 7);

}



// Helper function to convert number to words

function numberToWords(num: number): string {

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',

    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const scales = ['', 'Thousand', 'Million', 'Billion'];



  if (num === 0) return 'Zero Only';



  const wholePart = Math.floor(num);

  const decimalPart = Math.round((num - wholePart) * 100);



  function convertHundreds(n: number): string {

    let result = '';

    if (n >= 100) {

      result += ones[Math.floor(n / 100)] + ' Hundred ';

      n %= 100;

    }

    if (n >= 20) {

      result += tens[Math.floor(n / 10)] + ' ';

      n %= 10;

    }

    if (n > 0) {

      result += ones[n] + ' ';

    }

    return result;

  }



  function convertNumber(n: number): string {

    if (n === 0) return '';

    let result = '';

    let scaleIndex = 0;

    while (n > 0) {

      const chunk = n % 1000;

      if (chunk > 0) {

        result = convertHundreds(chunk) + scales[scaleIndex] + ' ' + result;

      }

      n = Math.floor(n / 1000);

      scaleIndex++;

    }

    return result.trim();

  }



  let result = convertNumber(wholePart);

  if (decimalPart > 0) {

    result += ' and ' + convertNumber(decimalPart) + ' Cents';

  }

  result += ' Only';



  return result;

}



// Add page numbers to all pages

function addPageNumbers(pdf: jsPDF, colors: ColorScheme) {

  const pageCount = pdf.getNumberOfPages();

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();



  for (let i = 1; i <= pageCount; i++) {

    pdf.setPage(i);

    pdf.setFontSize(8);

    pdf.setTextColor(...colors.gray);

    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 5, { align: 'right' });

  }

}



// =====================================================

// INVOICE TEMPLATE - Clean professional style (matching uploaded design)

// =====================================================

async function generateInvoicePDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 15;

  let yPos = 15;



  const addText = createTextHelper(pdf, colors.textOnLight);



  // Logo at top center

  const logoSizes = { small: 35, medium: 45, large: 55 };

  const logoMaxSize = logoSizes[settings.logoSize];

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);

      const logoX = (pageWidth - dims.width) / 2;

      pdf.addImage(dims.dataUrl, dims.format, logoX, yPos, dims.width, dims.height);

      yPos += dims.height + 5;

    } catch { }

  }



  // Company name and website centered

  addText(company.name.toUpperCase(), pageWidth / 2, yPos, { fontSize: 14, fontStyle: 'bold', color: colors.dark, align: 'center' });

  yPos += 6;

  if (company.website) {

    addText(company.website, pageWidth / 2, yPos, { fontSize: 8, color: colors.gray, align: 'center' });

    yPos += 10;

  } else {

    yPos += 8;

  }



  // "INVOICE" title on right (large) - positioned early to avoid overlap

  const invoiceTitleY = yPos;

  addText('INVOICE', pageWidth - margin, invoiceTitleY, { fontSize: 36, fontStyle: 'bold', color: colors.dark, align: 'right' });



  // Invoice Number and Date on right

  const invoiceDetailsY = invoiceTitleY + 15;

  addText('Invoice Number:', pageWidth - margin - 55, invoiceDetailsY, { fontSize: 9, color: colors.gray });

  addText(document.documentNumber, pageWidth - margin, invoiceDetailsY, { fontSize: 9, fontStyle: 'bold', align: 'right' });



  addText('Invoice Date:', pageWidth - margin - 55, invoiceDetailsY + 8, { fontSize: 9, color: colors.gray });

  addText(formatDate(document.dateIssued), pageWidth - margin, invoiceDetailsY + 8, { fontSize: 9, fontStyle: 'bold', align: 'right' });



  // "INVOICE TO:" section on left - with proper spacing

  yPos += 5;

  addText('INVOICE TO:', margin, yPos, { fontSize: 11, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 8;



  // Client complete information (left side) - NO ICONS, just clean text

  // Client Name (bold) — wrapped to stay clear of right column
  const clientNameMaxWI = (pageWidth - margin - 55) - margin - 5;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesI = pdf.splitTextToSize(client.name, clientNameMaxWI) as string[];
  clientNameLinesI.forEach((line, i) => { pdf.text(line, margin, yPos + i * 6); });
  yPos += clientNameLinesI.length * 6;



  // Contact Person

  if (client.contactPerson) {

    addText(client.contactPerson, margin, yPos, { fontSize: 9, color: colors.gray });

    yPos += 5;

  }



  // Phone

  addText(`Phone: ${client.phone || 'N/A'}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;



  // Email

  addText(`Email: ${client.email}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;



  // Full Address - properly formatted

  addText(`Address: ${client.address.street}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(`${client.address.city}, ${client.address.state} ${client.address.postalCode}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(client.address.country, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 12;



  // Items table with themed header

  const tableHeaders = ['SL.', 'ITEM DESCRIPTION', 'UNIT PRICE', 'QUANTITY', 'TOTAL'];

  const tableData = document.items.map((item, i) => [

    (i + 1).toString().padStart(2, '0'),

    item.name + (item.description ? `\n${item.description}` : ''),

    formatCurrency(item.unitPrice),

    item.quantity.toString(),

    formatCurrency(item.total),

  ]);



  autoTable(pdf, {

    head: [tableHeaders],

    body: tableData,

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: {

      fillColor: colors.dark, // Use theme dark color

      textColor: colors.textOnDark, // Use contrasting text color

      fontStyle: 'bold',

      fontSize: 9,

      halign: 'left',

    },

    bodyStyles: {

      fontSize: 9,

      textColor: colors.textOnLight,

      cellPadding: 5,

    },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: {

      lineColor: [220, 220, 220],

      lineWidth: 0.1,

    },

    columnStyles: {

      0: { cellWidth: 15, halign: 'center' },

      1: { cellWidth: 'auto', halign: 'left' },

      2: { cellWidth: 30, halign: 'right' },

      3: { cellWidth: 25, halign: 'center' },

      4: { cellWidth: 30, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }




  // Bank Information section (left side)

  const bankInfoY = yPos;

  addText('BANK INFORMATION', margin, bankInfoY, { fontSize: 10, fontStyle: 'bold', color: colors.textOnLight });

  yPos = bankInfoY + 7;



  if (company.bankInfo) {

    addText(`Bank Name       : ${company.bankInfo.bankName}`, margin, yPos, { fontSize: 8, color: colors.gray });

    yPos += 5;

    addText(`Branch Code     : ${company.bankInfo.swiftCode || 'N/A'}`, margin, yPos, { fontSize: 8, color: colors.gray });

    yPos += 5;

    addText(`Account No.     : ${company.bankInfo.accountNumber}`, margin, yPos, { fontSize: 8, color: colors.gray });

  }



  // Terms and Condition section (left side, below bank info)

  yPos += 10;

  addText('TERMS AND CONDITION', margin, yPos, { fontSize: 10, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 7;



  if (settings.showTerms && document.terms) {

    const termsLines = pdf.splitTextToSize(document.terms, 90);

    pdf.setFontSize(8);

    pdf.setTextColor(...colors.gray);

    pdf.text(termsLines, margin, yPos);

  } else {

    addText('Payment due within 30 days of invoice date.', margin, yPos, { fontSize: 8, color: colors.gray });

  }



  // Totals section (right side)

  const totalsWidth = 70;

  const totalsX = pageWidth - margin - totalsWidth;

  let totalsY = bankInfoY;



  // Sub Total

  addText('Sub Total', totalsX, totalsY, { fontSize: 10, color: colors.textOnLight });

  addText(formatCurrency(document.subtotal), pageWidth - margin, totalsY, { fontSize: 10, align: 'right' });

  totalsY += 8;



  // Shipping (if applicable)

  addText('Shipping', totalsX, totalsY, { fontSize: 10, color: colors.textOnLight });

  addText(formatCurrency(0), pageWidth - margin, totalsY, { fontSize: 10, align: 'right' });

  totalsY += 8;



  // Tax Rate

  addText('Tax Rate', totalsX, totalsY, { fontSize: 10, color: colors.textOnLight });

  addText(formatCurrency(document.taxTotal), pageWidth - margin, totalsY, { fontSize: 10, align: 'right' });

  totalsY += 12;



  // TOTAL with themed dark background

  pdf.setFillColor(...colors.dark); // Use theme dark color

  pdf.rect(totalsX - 3, totalsY - 6, totalsWidth + 3, 12, 'F');

  addText('TOTAL', totalsX, totalsY, { fontSize: 11, fontStyle: 'bold', color: colors.textOnDark }); // Use contrasting text

  addText(formatCurrency(document.grandTotal), pageWidth - margin, totalsY, { fontSize: 11, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });



  // Signature section — anchored below grand total

  const signatureY = totalsY + 18;

  const signatureX = pageWidth - margin - 60;



  pdf.setDrawColor(...colors.gray);

  pdf.setLineWidth(0.3);

  pdf.line(signatureX, signatureY, pageWidth - margin, signatureY);



  addText('Authorized Signature', pageWidth - margin, signatureY + 6, { fontSize: 10, fontStyle: 'bold', align: 'right' });

  addText('Designation Here', pageWidth - margin, signatureY + 11, { fontSize: 8, color: colors.gray, align: 'right' });

}



// =====================================================

// PURCHASE ORDER TEMPLATE - Minimalist professional style (matching uploaded design)

// =====================================================

async function generatePurchaseOrderPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 20;

  let yPos = 20;



  const addText = createTextHelper(pdf, colors.textOnLight);



  // "PURCHASE ORDER" title at top left

  addText('PURCHASE ORDER', margin, yPos, { fontSize: 16, fontStyle: 'normal', color: colors.textOnLight });

  yPos += 15;



  // Logo in top right

  const logoSizes = { small: 30, medium: 40, large: 50 };

  const logoMaxSize = logoSizes[settings.logoSize];

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);

      const logoX = pageWidth - margin - dims.width;

      pdf.addImage(dims.dataUrl, dims.format, logoX, 15, dims.width, dims.height);

    } catch { }

  }



  // Company name and address (top left, below title)

  addText(company.name, margin, yPos, { fontSize: 10, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 5;

  addText(`${company.address.street}, ${company.address.city} ${company.address.postalCode}, ${company.address.country}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 15;



  // "FOR" section (Supplier/Vendor info)

  addText('FOR', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 6;

  // Wrap long vendor names to stay clear of right-column order details
  const clientNameMaxWF = (pageWidth - margin - 60) - margin - 5;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesF = pdf.splitTextToSize(client.name, clientNameMaxWF) as string[];
  clientNameLinesF.forEach((line, i) => { pdf.text(line, margin, yPos + i * 6); });
  yPos += clientNameLinesF.length * 6;

  addText(client.address.street, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(`${client.address.city}, ${client.address.state}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(client.address.country, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 15;



  // Order details on right side

  const detailsX = pageWidth - margin - 60;

  const detailsY = 50;



  addText('Order No.:', detailsX, detailsY, { fontSize: 9, color: colors.gray });

  addText(document.documentNumber, pageWidth - margin, detailsY, { fontSize: 9, fontStyle: 'bold', align: 'right' });



  addText('Issue date:', detailsX, detailsY + 6, { fontSize: 9, color: colors.gray });

  addText(formatDate(document.dateIssued), pageWidth - margin, detailsY + 6, { fontSize: 9, fontStyle: 'bold', align: 'right' });



  yPos += 5;



  // Items table - simple clean design

  const currency = getCurrencyByCode(settings.currencyCode || 'ZMW');

  const tableHeaders = ['DESCRIPTION', 'QUANTITY', `UNIT PRICE (${currency.symbol})`, `AMOUNT (${currency.symbol})`];

  const tableData = document.items.map((item) => [

    item.name + (item.description ? `\n${item.description}` : ''),

    item.quantity.toString(),

    formatCurrency(item.unitPrice),

    formatCurrency(item.total),

  ]);



  autoTable(pdf, {

    head: [tableHeaders],

    body: tableData,

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: {

      fillColor: [255, 255, 255],

      textColor: colors.textOnLight,

      fontStyle: 'bold',

      fontSize: 9,

      halign: 'left',

      lineColor: [200, 200, 200],

      lineWidth: { bottom: 0.5, top: 0, left: 0, right: 0 },

    },

    bodyStyles: {

      fontSize: 9,

      textColor: colors.textOnLight,

      cellPadding: 5,

      lineColor: [240, 240, 240],

      lineWidth: 0.1,

    },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: {

      lineColor: [240, 240, 240],

      lineWidth: 0.1,

    },

    columnStyles: {

      0: { cellWidth: 'auto', halign: 'left' },

      1: { cellWidth: 30, halign: 'center' },

      2: { cellWidth: 35, halign: 'right' },

      3: { cellWidth: 35, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }




  // Totals section (right aligned, simple)

  const totalsWidth = 70;

  const totalsX = pageWidth - margin - totalsWidth;



  // Draw top border for totals

  pdf.setDrawColor(200, 200, 200);

  pdf.setLineWidth(0.5);

  pdf.line(totalsX, yPos - 5, pageWidth - margin, yPos - 5);



  addText(`TOTAL (${currency.code}):`, totalsX, yPos, { fontSize: 10, fontStyle: 'normal', color: colors.textOnLight });

  addText(formatCurrency(document.subtotal), pageWidth - margin, yPos, { fontSize: 10, fontStyle: 'normal', align: 'right' });

  yPos += 10;



  // TOTAL DUE with themed dark background

  pdf.setFillColor(...colors.dark); // Use theme dark color

  pdf.rect(totalsX - 3, yPos - 6, totalsWidth + 3, 12, 'F');

  addText(`TOTAL DUE (${currency.code}):`, totalsX, yPos, { fontSize: 10, fontStyle: 'bold', color: colors.textOnDark }); // Use contrasting text

  addText(formatCurrency(document.grandTotal), pageWidth - margin, yPos, { fontSize: 10, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });



  yPos += 25;



  // Signature section

  addText('Issued by, signature', pageWidth - margin, yPos, { fontSize: 9, color: colors.gray, align: 'right', fontStyle: 'italic' });

  yPos += 15;



  // Signature line and name

  const signatureX = pageWidth - margin - 80;

  pdf.setDrawColor(...colors.gray);

  pdf.setLineWidth(0.3);

  pdf.line(signatureX, yPos, pageWidth - margin, yPos);

  addText(company.name, pageWidth - margin, yPos + 6, { fontSize: 10, fontStyle: 'italic', color: colors.textOnLight, align: 'right' });



  // Footer with company details at bottom

  const footerY = pageHeight - 20;



  // Horizontal line above footer

  pdf.setDrawColor(200, 200, 200);

  pdf.setLineWidth(0.3);

  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);



  // Company details in footer

  const footerText = `${company.name}, ${company.address.street}, ${company.address.city} ${company.address.postalCode}, ${company.address.country}  Email: ${company.email}`;

  addText(footerText, pageWidth / 2, footerY, { fontSize: 7, color: colors.gray, align: 'center' });

}



// =====================================================

// DELIVERY NOTE TEMPLATE - Simple clean style

// =====================================================

async function generateDeliveryNotePDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 20;

  let yPos = 20;



  const addText = createTextHelper(pdf, colors.textOnLight);



  // "DELIVERY NOTE" title at top left

  addText('DELIVERY NOTE', margin, yPos, { fontSize: 16, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 15;



  // Logo in top right

  const logoSizes = { small: 30, medium: 40, large: 50 };

  const logoMaxSize = logoSizes[settings.logoSize];

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);

      const logoX = pageWidth - margin - dims.width;

      pdf.addImage(dims.dataUrl, dims.format, logoX, 15, dims.width, dims.height);

    } catch { }

  }



  // Company name and address (top left, below title)

  addText(company.name, margin, yPos, { fontSize: 10, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 5;

  addText(`${company.address.street}, ${company.address.city} ${company.address.postalCode}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(company.address.country, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 15;



  // Delivery details on right side

  const detailsX = pageWidth - margin - 60;

  const detailsY = 50;



  addText('Delivery Note #:', detailsX, detailsY, { fontSize: 9, color: colors.gray });

  addText(document.documentNumber, pageWidth - margin, detailsY, { fontSize: 9, fontStyle: 'bold', align: 'right' });



  addText('Delivery Date:', detailsX, detailsY + 6, { fontSize: 9, color: colors.gray });

  addText(formatDate((document as DeliveryNote).deliveryDate), pageWidth - margin, detailsY + 6, { fontSize: 9, fontStyle: 'bold', align: 'right' });



  if (document.referenceNumber) {

    addText('Reference:', detailsX, detailsY + 12, { fontSize: 9, color: colors.gray });

    addText(document.referenceNumber, pageWidth - margin, detailsY + 12, { fontSize: 9, fontStyle: 'bold', align: 'right' });

  }



  // "FROM" section (Shipper/Company info)

  addText('FROM (SHIPPER)', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 6;

  addText(company.name, margin, yPos, { fontSize: 10, fontStyle: 'normal', color: colors.textOnLight });

  yPos += 5;

  addText(company.address.street, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(`${company.address.city}, ${company.address.state}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(`Phone: ${company.phone}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 12;



  // "TO" section (Receiver/Client info)

  addText('TO (RECEIVER)', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 6;

  // Wrap long client names to prevent page overflow
  const clientNameMaxWR2 = (pageWidth - margin - 60) - margin - 5;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesR2 = pdf.splitTextToSize(client.name, clientNameMaxWR2) as string[];
  clientNameLinesR2.forEach((line, i) => { pdf.text(line, margin, yPos + i * 6); });
  yPos += clientNameLinesR2.length * 6;

  if (client.contactPerson) {

    addText(client.contactPerson, margin, yPos, { fontSize: 9, color: colors.gray });

    yPos += 5;

  }

  addText(client.address.street, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(`${client.address.city}, ${client.address.state}`, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 5;

  addText(client.address.country, margin, yPos, { fontSize: 9, color: colors.gray });

  yPos += 15;



  // Items table - simple clean design

  const tableHeaders = ['#', 'ITEM', 'DESCRIPTION', 'QTY ORDERED', 'QTY SHIPPED'];

  const tableData = document.items.map((item, i) => [

    (i + 1).toString(),

    item.name,

    item.description || '-',

    item.quantity.toString(),

    item.quantity.toString(), // Assuming all ordered items are shipped

  ]);



  autoTable(pdf, {

    head: [tableHeaders],

    body: tableData,

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: {

      fillColor: colors.dark, // Use theme dark color

      textColor: colors.textOnDark,

      fontStyle: 'bold',

      fontSize: 9,

      halign: 'left',

    },

    bodyStyles: {

      fontSize: 9,

      textColor: colors.textOnLight,

      cellPadding: 5,

      lineColor: [240, 240, 240],

      lineWidth: 0.1,

    },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: {

      lineColor: [240, 240, 240],

      lineWidth: 0.1,

    },

    columnStyles: {

      0: { cellWidth: 12, halign: 'center' },

      1: { cellWidth: 50, halign: 'left' },

      2: { cellWidth: 'auto', halign: 'left' },

      3: { cellWidth: 28, halign: 'center' },

      4: { cellWidth: 28, halign: 'center' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Total Items Delivered
  const totalItemsDelivered = document.items.reduce((sum, item) => sum + item.quantity, 0);
  pdf.setFillColor(...colors.dark);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');
  addText('TOTAL ITEMS DELIVERED', margin + 3, yPos + 8, { fontSize: 10, fontStyle: 'bold', color: colors.textOnDark });
  addText(totalItemsDelivered.toString(), pageWidth - margin - 3, yPos + 8, { fontSize: 10, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });
  yPos += 24;

  // Check if we need a new page for signature section

  if (yPos > pageHeight - 80) {

    pdf.addPage();

    yPos = margin;

  }



  // Notes section (if any)

  if (settings.showTerms && document.notes) {

    addText('Notes:', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.textOnLight });

    yPos += 6;

    const notesLines = pdf.splitTextToSize(document.notes, pageWidth - 2 * margin);

    pdf.setFontSize(8);

    pdf.setTextColor(...colors.gray);

    pdf.text(notesLines, margin, yPos);

    yPos += (notesLines.length * 4) + 15;

  }



  // Signature section - simple lines

  addText('RECEIVED BY', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.textOnLight });

  yPos += 15;



  // Signature line

  pdf.setDrawColor(...colors.gray);

  pdf.setLineWidth(0.3);

  pdf.line(margin, yPos, margin + 80, yPos);

  addText('Signature', margin, yPos + 6, { fontSize: 8, color: colors.gray });



  // Date line

  const dateLineX = margin + 100;

  pdf.line(dateLineX, yPos, dateLineX + 60, yPos);

  addText('Date', dateLineX, yPos + 6, { fontSize: 8, color: colors.gray });



  // Footer with company details at bottom

  const footerY = pageHeight - 20;



  // Horizontal line above footer

  pdf.setDrawColor(200, 200, 200);

  pdf.setLineWidth(0.3);

  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);



  // Company details in footer

  const footerText = `${company.name}, ${company.address.street}, ${company.address.city} ${company.address.postalCode}, ${company.address.country}  |  Phone: ${company.phone}  |  Email: ${company.email}`;

  addText(footerText, pageWidth / 2, footerY, { fontSize: 7, color: colors.gray, align: 'center' });

}



// =====================================================

// QUOTATION — CORPORATE TEMPLATE

// Full-width dark header bar, bordered info boxes, striped table

// =====================================================

async function generateQuotationCorporatePDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 15;

  const addText = createTextHelper(pdf, colors.textOnLight);



  // ── Full-width dark header bar ─────────────────────────────────

  const headerH = 44;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, headerH, 'F');



  const logoSizes = { small: 22, medium: 30, large: 38 };

  const logoMaxSize = logoSizes[settings.logoSize];

  let logoEndX = margin;

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);

      pdf.addImage(dims.dataUrl, dims.format, margin, (headerH - dims.height) / 2, dims.width, dims.height);

      logoEndX = margin + dims.width + 6;

    } catch { }

  }

  addText(company.name.toUpperCase(), logoEndX, 14, { fontSize: 13, fontStyle: 'bold', color: colors.textOnDark });

  addText(`${company.address.street}, ${company.address.city}  |  ${company.phone}  |  ${company.email}`, logoEndX, 23, { fontSize: 7, color: [180, 200, 220] });

  addText('QUOTATION', pageWidth - margin, 16, { fontSize: 20, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });

  addText(`# ${document.documentNumber}`, pageWidth - margin, 27, { fontSize: 8.5, color: [180, 200, 220], align: 'right' });

  addText(`Date: ${formatDate(document.dateIssued)}`, pageWidth - margin, 35, { fontSize: 8, color: [180, 200, 220], align: 'right' });



  let yPos = headerH + 12;



  // ── Two side-by-side info boxes ────────────────────────────────

  const boxW = (pageWidth - 2 * margin - 8) / 2;

  const boxH = 50;



  const drawInfoBox = (x: number, headerLabel: string, headerColor: [number, number, number], lines: { bold?: string; normal?: string; gray?: string }[]) => {

    pdf.setFillColor(248, 250, 252);

    pdf.rect(x, yPos, boxW, boxH, 'F');

    pdf.setFillColor(...headerColor);

    pdf.rect(x, yPos, boxW, 8, 'F');

    addText(headerLabel, x + 4, yPos + 5.5, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });

    let ly = yPos + 15;

    lines.forEach(l => {

      if (l.bold) {
        // Wrap bold text (e.g. client name) within the box width
        const boldLines = pdf.splitTextToSize(l.bold, boxW - 8) as string[];
        pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
        boldLines.forEach((bl, i) => { pdf.text(bl, x + 4, ly + i * 6); });
        ly += boldLines.length * 6;
      } else if (l.gray) { addText(l.gray, x + 4, ly, { fontSize: 8, color: colors.gray }); ly += 5; }

      else if (l.normal) { addText(l.normal, x + 4, ly, { fontSize: 8 }); ly += 5; }

    });

  };



  drawInfoBox(margin, 'QUOTATION FROM', colors.primary, [

    { bold: company.name },

    { gray: company.address.street },

    { gray: `${company.address.city}, ${company.address.state} ${company.address.postalCode}` },

    { gray: company.address.country },

    ...(company.tin ? [{ gray: `Tax ID: ${company.tin}` }] : []),

  ]);

  drawInfoBox(margin + boxW + 8, 'QUOTATION TO', colors.dark, [

    { bold: client.name },

    { gray: client.address.street },

    { gray: `${client.address.city}, ${client.address.state} ${client.address.postalCode}` },

    { gray: client.address.country },

    ...(client.tin ? [{ gray: `Tax ID: ${client.tin}` }] : []),

  ]);



  yPos += boxH + 12;



  // ── Items table ────────────────────────────────────────────────

  const stripeFill: [number, number, number] = [

    Math.round(colors.primary[0] + (255 - colors.primary[0]) * 0.92),

    Math.round(colors.primary[1] + (255 - colors.primary[1]) * 0.92),

    Math.round(colors.primary[2] + (255 - colors.primary[2]) * 0.92),

  ];

  autoTable(pdf, {

    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Amount']],

    body: document.items.map((item, i) => [

      (i + 1).toString(),

      item.name + (item.description ? `\n${item.description}` : ''),

      item.quantity.toString(),

      formatCurrency(item.unitPrice),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 9, textColor: colors.textOnLight, cellPadding: 5 },

    alternateRowStyles: { fillColor: stripeFill },

    styles: { lineColor: [220, 220, 220], lineWidth: 0.1 },

    columnStyles: {

      0: { cellWidth: 12, halign: 'center' },

      1: { cellWidth: 'auto', halign: 'left' },

      2: { cellWidth: 20, halign: 'center' },

      3: { cellWidth: 35, halign: 'right' },

      4: { cellWidth: 38, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }


  const tableEndY = yPos;

  const rightColW = (pageWidth - 2 * margin) * 0.44;

  const rightColX = pageWidth - margin - rightColW;



  // ── Terms (left) ──────────────────────────────────────────────

  if (settings.showTerms && document.terms) {

    addText('TERMS & CONDITIONS', margin, tableEndY, { fontSize: 9, fontStyle: 'bold', color: colors.primary });

    let ty = tableEndY + 6;

    document.terms.split('\n').filter(l => l.trim()).forEach((term, i) => {

      const wrapped = pdf.splitTextToSize(`${i + 1}. ${term.replace(/^\d+\.\s*/, '')}`, rightColX - margin - 8);

      pdf.setFontSize(8); pdf.setTextColor(...colors.textOnLight); pdf.text(wrapped, margin + 2, ty);

      ty += wrapped.length * 4 + 2;

    });

  }



  // ── Totals (right) ────────────────────────────────────────────

  let ty = tableEndY;

  const totalRows: [string, string, ([number, number, number] | undefined)?][] = [

    ['Sub Total', formatCurrency(document.subtotal)],

    ...(document.taxType !== 'none' && document.taxPercent > 0 ? [[document.taxType === 'vat' ? `VAT (${document.taxPercent}%)` : `TOT (${document.taxPercent}%)`, formatCurrency(document.taxTotal)] as [string, string]] : []),

    ...(document.discount > 0 ? [['Discount', `- ${formatCurrency(document.discountType === 'percentage' ? document.subtotal * document.discount / 100 : document.discount)}`, [34, 197, 94] as [number, number, number]] as [string, string, [number, number, number]?]] : []),

  ];

  totalRows.forEach(([label, value, color]) => {

    addText(label as string, rightColX, ty, { fontSize: 9, ...(color ? { color: color as [number, number, number] } : {}) });

    addText(value as string, pageWidth - margin, ty, { fontSize: 9, align: 'right', ...(color ? { color: color as [number, number, number] } : {}) });

    ty += 8;

  });

  // Grand Total bar

  pdf.setFillColor(...colors.primary);

  pdf.rect(rightColX - 3, ty - 3, rightColW + 3, 13, 'F');

  addText('TOTAL', rightColX + 2, ty + 6, { fontSize: 10, fontStyle: 'bold', color: [255, 255, 255] });

  addText(formatCurrency(document.grandTotal), pageWidth - margin - 2, ty + 6, { fontSize: 12, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });



  // Notes

  ty += 20;

  if (settings.showTerms && document.notes) {

    addText('Additional Notes', margin, ty, { fontSize: 9, fontStyle: 'bold', color: colors.primary });

    const nl = pdf.splitTextToSize(document.notes, rightColX - margin - 8);

    pdf.setFontSize(8); pdf.setTextColor(...colors.gray); pdf.text(nl, margin, ty + 6);

  }



  // ── Footer bar ─────────────────────────────────────────────────

  const fY = pageHeight - 18;

  pdf.setFillColor(...colors.primary);

  pdf.rect(0, fY - 5, pageWidth, 2, 'F');

  addText(`${company.name}  |  ${company.phone}  |  ${company.email}${company.website ? '  |  ' + company.website : ''}`, pageWidth / 2, fY, { fontSize: 7, color: colors.gray, align: 'center' });

  addText(settings.footerText || 'This document was generated electronically.', pageWidth / 2, fY + 6, { fontSize: 7, color: colors.gray, align: 'center', fontStyle: 'italic' });

}



// =====================================================

// INVOICE — CORPORATE TEMPLATE

// Dark header, Bill To + Invoice Details boxes, striped table

// =====================================================

async function generateInvoiceCorporatePDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 15;

  const addText = createTextHelper(pdf, colors.textOnLight);



  // ── Header bar ─────────────────────────────────────────────────

  const headerH = 46;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, headerH, 'F');



  const logoSizes = { small: 24, medium: 32, large: 40 };

  let logoEndX = margin;

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, margin, (headerH - dims.height) / 2, dims.width, dims.height);

      logoEndX = margin + dims.width + 6;

    } catch { }

  }

  addText(company.name.toUpperCase(), logoEndX, 14, { fontSize: 13, fontStyle: 'bold', color: colors.textOnDark });

  addText(`${company.address.street}, ${company.address.city} ${company.address.postalCode}`, logoEndX, 23, { fontSize: 7.5, color: [180, 200, 220] });

  addText(`${company.phone}  |  ${company.email}`, logoEndX, 31, { fontSize: 7.5, color: [180, 200, 220] });

  addText('INVOICE', pageWidth - margin, 18, { fontSize: 22, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });

  addText(`# ${document.documentNumber}`, pageWidth - margin, 29, { fontSize: 8.5, color: [180, 200, 220], align: 'right' });

  addText(`Date: ${formatDate(document.dateIssued)}`, pageWidth - margin, 37, { fontSize: 8, color: [180, 200, 220], align: 'right' });



  let yPos = headerH + 12;



  // ── Bill To + Invoice Details boxes ───────────────────────────

  const boxW = (pageWidth - 2 * margin - 8) / 2;

  const boxH = 52;



  // BILL TO

  pdf.setFillColor(248, 250, 252);

  pdf.rect(margin, yPos, boxW, boxH, 'F');

  pdf.setFillColor(...colors.primary);

  pdf.rect(margin, yPos, boxW, 8, 'F');

  addText('BILL TO', margin + 4, yPos + 5.5, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });

  let billY = yPos + 15;

  // Wrap long client names within the box
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesBill = pdf.splitTextToSize(client.name, boxW - 8) as string[];
  clientNameLinesBill.forEach((line, i) => { pdf.text(line, margin + 4, billY + i * 6); });
  billY += clientNameLinesBill.length * 6;

  if (client.contactPerson) { addText(client.contactPerson, margin + 4, billY, { fontSize: 8, color: colors.gray }); billY += 5; }

  addText(client.address.street, margin + 4, billY, { fontSize: 8, color: colors.gray }); billY += 5;

  addText(`${client.address.city}, ${client.address.state}`, margin + 4, billY, { fontSize: 8, color: colors.gray }); billY += 5;

  addText(client.address.country, margin + 4, billY, { fontSize: 8, color: colors.gray }); billY += 5;

  if (client.tin) addText(`Tax ID: ${client.tin}`, margin + 4, billY, { fontSize: 7.5, color: colors.gray });



  // INVOICE DETAILS

  const inv = document as Invoice;

  const detXInv = margin + boxW + 8;

  pdf.setFillColor(248, 250, 252);

  pdf.rect(detXInv, yPos, boxW, boxH, 'F');

  pdf.setFillColor(...colors.dark);

  pdf.rect(detXInv, yPos, boxW, 8, 'F');

  addText('INVOICE DETAILS', detXInv + 4, yPos + 5.5, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });

  const invRows: [string, string][] = [

    ['Invoice Date', formatDate(document.dateIssued)],

    ...(inv.dueDate ? [['Due Date', formatDate(inv.dueDate)] as [string, string]] : []),

    ...(document.referenceNumber ? [['Reference', document.referenceNumber] as [string, string]] : []),

    ['Status', document.status.toUpperCase().replace('_', ' ')],

  ];

  let invRowY = yPos + 16;

  invRows.forEach(([label, value]) => {

    addText(label + ':', detXInv + 4, invRowY, { fontSize: 8, color: colors.gray });

    addText(value, detXInv + boxW - 4, invRowY, { fontSize: 8, fontStyle: 'bold', align: 'right' });

    invRowY += 7;

  });



  yPos += boxH + 12;



  // ── Items table ────────────────────────────────────────────────

  const stripeFill: [number, number, number] = [

    Math.round(colors.primary[0] + (255 - colors.primary[0]) * 0.93),

    Math.round(colors.primary[1] + (255 - colors.primary[1]) * 0.93),

    Math.round(colors.primary[2] + (255 - colors.primary[2]) * 0.93),

  ];

  autoTable(pdf, {

    head: [['SL', 'ITEM DESCRIPTION', 'UNIT PRICE', 'QTY', 'TOTAL']],

    body: document.items.map((item, i) => [

      (i + 1).toString().padStart(2, '0'),

      item.name + (item.description ? `\n${item.description}` : ''),

      formatCurrency(item.unitPrice),

      item.quantity.toString(),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.dark, textColor: colors.textOnDark, fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 9, textColor: colors.textOnLight, cellPadding: 5 },

    alternateRowStyles: { fillColor: stripeFill },

    styles: { lineColor: [220, 220, 220], lineWidth: 0.1 },

    columnStyles: {

      0: { cellWidth: 15, halign: 'center' },

      1: { cellWidth: 'auto', halign: 'left' },

      2: { cellWidth: 32, halign: 'right' },

      3: { cellWidth: 22, halign: 'center' },

      4: { cellWidth: 32, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }


  const bottomY = yPos;

  const rightColW = (pageWidth - 2 * margin) * 0.44;

  const rightColX = pageWidth - margin - rightColW;



  // ── Bank Info + Terms (left) ───────────────────────────────────

  if (settings.showBankInfo && company.bankInfo) {

    addText('BANK INFORMATION', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.dark });

    let by = yPos + 6;

    [

      ['Bank Name', company.bankInfo.bankName],

      ['Account Name', company.bankInfo.accountName],

      ['Account No.', company.bankInfo.accountNumber],

      ...(company.bankInfo.swiftCode ? [['Swift / Branch', company.bankInfo.swiftCode]] : []),

    ].forEach(([lbl, val]) => {

      addText(`${lbl}:`, margin, by, { fontSize: 8, color: colors.gray });

      addText(val, margin + 30, by, { fontSize: 8, fontStyle: 'bold' });

      by += 5.5;

    });

    if (settings.showTerms && document.terms) {

      by += 4;

      addText('TERMS & CONDITIONS', margin, by, { fontSize: 9, fontStyle: 'bold', color: colors.dark });

      const termLines = pdf.splitTextToSize(document.terms, rightColX - margin - 8);

      pdf.setFontSize(8); pdf.setTextColor(...colors.gray); pdf.text(termLines, margin, by + 6);

    }

  }



  // ── Totals (right) ────────────────────────────────────────────

  let totR = bottomY;

  [

    ['Sub Total', formatCurrency(document.subtotal)],

    ['Shipping', formatCurrency(0)],

    ...(document.taxType !== 'none' && document.taxPercent > 0 ? [[document.taxType === 'vat' ? `VAT (${document.taxPercent}%)` : `TOT (${document.taxPercent}%)`, formatCurrency(document.taxTotal)]] : []),

    ...(document.discount > 0 ? [['Discount', `- ${formatCurrency(document.discountType === 'percentage' ? document.subtotal * document.discount / 100 : document.discount)}`]] : []),

  ].forEach(([lbl, val]) => {

    addText(lbl as string, rightColX, totR, { fontSize: 9 });

    addText(val as string, pageWidth - margin, totR, { fontSize: 9, align: 'right' });

    totR += 8;

  });

  pdf.setFillColor(...colors.dark);

  pdf.rect(rightColX - 3, totR - 3, rightColW + 3, 13, 'F');

  addText('TOTAL', rightColX + 2, totR + 6, { fontSize: 10, fontStyle: 'bold', color: [255, 255, 255] });

  addText(formatCurrency(document.grandTotal), pageWidth - margin - 2, totR + 6, { fontSize: 12, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });



  // Signature — anchored below grand total

  const sigY = totR + 18;

  pdf.setDrawColor(...colors.gray); pdf.setLineWidth(0.3);

  pdf.line(pageWidth - margin - 65, sigY, pageWidth - margin, sigY);

  addText('Authorized Signature', pageWidth - margin, sigY + 6, { fontSize: 9, color: colors.gray, align: 'right' });



  // ── Footer bar ─────────────────────────────────────────────────

  const fY = pageHeight - 18;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, fY - 5, pageWidth, 2, 'F');

  addText(`${company.name}  |  ${company.phone}  |  ${company.email}${company.website ? '  |  ' + company.website : ''}`, pageWidth / 2, fY, { fontSize: 7, color: colors.gray, align: 'center' });

  addText(settings.footerText || 'This document was generated electronically.', pageWidth / 2, fY + 6, { fontSize: 7, color: colors.gray, align: 'center', fontStyle: 'italic' });

}



// =====================================================

// PURCHASE ORDER — CORPORATE TEMPLATE

// Dark header, Vendor + Order Details boxes, striped table

// =====================================================

async function generatePurchaseOrderCorporatePDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 15;

  const addText = createTextHelper(pdf, colors.textOnLight);



  // ── Header bar ─────────────────────────────────────────────────

  const headerH = 46;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, headerH, 'F');



  let logoEndX = margin;

  if (settings.showLogo && company.logo) {

    try {

      const logoSizes = { small: 24, medium: 32, large: 40 };

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, margin, (headerH - dims.height) / 2, dims.width, dims.height);

      logoEndX = margin + dims.width + 6;

    } catch { }

  }

  addText(company.name.toUpperCase(), logoEndX, 14, { fontSize: 13, fontStyle: 'bold', color: colors.textOnDark });

  addText(`${company.address.street}, ${company.address.city}, ${company.address.country}`, logoEndX, 23, { fontSize: 7.5, color: [180, 200, 220] });

  addText(`${company.phone}  |  ${company.email}`, logoEndX, 31, { fontSize: 7.5, color: [180, 200, 220] });

  addText('PURCHASE ORDER', pageWidth - margin, 18, { fontSize: 18, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });

  addText(`# ${document.documentNumber}`, pageWidth - margin, 29, { fontSize: 8.5, color: [180, 200, 220], align: 'right' });

  addText(`Date: ${formatDate(document.dateIssued)}`, pageWidth - margin, 37, { fontSize: 8, color: [180, 200, 220], align: 'right' });



  let yPos = headerH + 12;



  // ── Vendor & Order Details boxes ───────────────────────────────

  const boxW = (pageWidth - 2 * margin - 8) / 2;

  const boxH = 50;



  // VENDOR box

  pdf.setFillColor(248, 250, 252);

  pdf.rect(margin, yPos, boxW, boxH, 'F');

  pdf.setFillColor(...colors.primary);

  pdf.rect(margin, yPos, boxW, 8, 'F');

  addText('VENDOR / SUPPLIER', margin + 4, yPos + 5.5, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });

  // Wrap long vendor names within the box
  let vendY = yPos + 15;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesVend = pdf.splitTextToSize(client.name, boxW - 8) as string[];
  clientNameLinesVend.forEach((line, i) => { pdf.text(line, margin + 4, vendY + i * 6); });
  vendY += clientNameLinesVend.length * 6;

  addText(client.address.street, margin + 4, vendY, { fontSize: 8, color: colors.gray }); vendY += 6;

  addText(`${client.address.city}, ${client.address.state}`, margin + 4, vendY, { fontSize: 8, color: colors.gray }); vendY += 6;

  addText(client.address.country, margin + 4, vendY, { fontSize: 8, color: colors.gray }); vendY += 6;

  if (client.email) addText(client.email, margin + 4, vendY, { fontSize: 7.5, color: colors.gray });



  // ORDER DETAILS box

  const po = document as PurchaseOrder;

  const detXPO = margin + boxW + 8;

  pdf.setFillColor(248, 250, 252);

  pdf.rect(detXPO, yPos, boxW, boxH, 'F');

  pdf.setFillColor(...colors.dark);

  pdf.rect(detXPO, yPos, boxW, 8, 'F');

  addText('ORDER DETAILS', detXPO + 4, yPos + 5.5, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });

  const detailRows: [string, string][] = [

    ['Order No.', document.documentNumber],

    ['Issue Date', formatDate(document.dateIssued)],

    ...(po.expectedDeliveryDate ? [['Expected', formatDate(po.expectedDeliveryDate)] as [string, string]] : []),

    ...(po.shippingMethod ? [['Shipping', po.shippingMethod] as [string, string]] : []),

    ...(document.referenceNumber ? [['Reference', document.referenceNumber] as [string, string]] : []),

  ];

  let detRowY = yPos + 16;

  detailRows.forEach(([label, value]) => {

    addText(`${label}:`, detXPO + 4, detRowY, { fontSize: 8, color: colors.gray });

    addText(value, detXPO + boxW - 4, detRowY, { fontSize: 8, fontStyle: 'bold', align: 'right' });

    detRowY += 7;

  });



  yPos += boxH + 12;



  // ── Items table ────────────────────────────────────────────────

  const stripeFill: [number, number, number] = [

    Math.round(colors.primary[0] + (255 - colors.primary[0]) * 0.93),

    Math.round(colors.primary[1] + (255 - colors.primary[1]) * 0.93),

    Math.round(colors.primary[2] + (255 - colors.primary[2]) * 0.93),

  ];

  autoTable(pdf, {

    head: [['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],

    body: document.items.map((item, i) => [

      (i + 1).toString(),

      item.name + (item.description ? `\n${item.description}` : ''),

      item.quantity.toString(),

      formatCurrency(item.unitPrice),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 9, textColor: colors.textOnLight, cellPadding: 5 },

    alternateRowStyles: { fillColor: stripeFill },

    styles: { lineColor: [220, 220, 220], lineWidth: 0.1 },

    columnStyles: {

      0: { cellWidth: 12, halign: 'center' },

      1: { cellWidth: 'auto', halign: 'left' },

      2: { cellWidth: 22, halign: 'center' },

      3: { cellWidth: 35, halign: 'right' },

      4: { cellWidth: 35, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }


  const bottomY = yPos;

  const rightColW = (pageWidth - 2 * margin) * 0.44;

  const rightColX = pageWidth - margin - rightColW;



  // ── Notes (left) ──────────────────────────────────────────────

  if (settings.showTerms && document.notes) {

    addText('NOTES', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.dark });

    const nl = pdf.splitTextToSize(document.notes, rightColX - margin - 8);

    pdf.setFontSize(8); pdf.setTextColor(...colors.gray); pdf.text(nl, margin, yPos + 7);

  }



  // ── Totals (right) ────────────────────────────────────────────

  let totR = bottomY;

  addText('Sub Total', rightColX, totR, { fontSize: 9 });

  addText(formatCurrency(document.subtotal), pageWidth - margin, totR, { fontSize: 9, align: 'right' });

  totR += 8;

  if (document.taxType !== 'none' && document.taxPercent > 0) {

    const taxLabel = document.taxType === 'vat' ? `VAT (${document.taxPercent}%)` : `TOT (${document.taxPercent}%)`;

    addText(taxLabel, rightColX, totR, { fontSize: 9 });

    addText(formatCurrency(document.taxTotal), pageWidth - margin, totR, { fontSize: 9, align: 'right' });

    totR += 8;

  }

  if (document.discount > 0) {

    const discAmt = document.discountType === 'percentage' ? document.subtotal * document.discount / 100 : document.discount;

    addText(document.discountType === 'percentage' ? `Discount (${document.discount}%)` : 'Discount', rightColX, totR, { fontSize: 9, color: [34, 197, 94] });

    addText(`- ${formatCurrency(discAmt)}`, pageWidth - margin, totR, { fontSize: 9, color: [34, 197, 94], align: 'right' });

    totR += 8;

  }

  pdf.setFillColor(...colors.primary);

  pdf.rect(rightColX - 3, totR - 3, rightColW + 3, 13, 'F');

  addText('TOTAL DUE', rightColX + 2, totR + 6, { fontSize: 10, fontStyle: 'bold', color: [255, 255, 255] });

  addText(formatCurrency(document.grandTotal), pageWidth - margin - 2, totR + 6, { fontSize: 12, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });



  // Signature

  const sigY = pageHeight - 40;

  pdf.setDrawColor(...colors.gray); pdf.setLineWidth(0.3);

  pdf.line(pageWidth - margin - 65, sigY, pageWidth - margin, sigY);

  addText('Authorized Signature', pageWidth - margin, sigY + 6, { fontSize: 9, color: colors.gray, align: 'right' });

  addText(company.name, pageWidth - margin, sigY + 12, { fontSize: 8, color: colors.gray, fontStyle: 'italic', align: 'right' });



  // ── Footer bar ─────────────────────────────────────────────────

  const fY = pageHeight - 18;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, fY - 5, pageWidth, 2, 'F');

  addText(`${company.name}  |  ${company.phone}  |  ${company.email}`, pageWidth / 2, fY, { fontSize: 7, color: colors.gray, align: 'center' });

}



// =====================================================

// DELIVERY NOTE — CORPORATE TEMPLATE

// Dark header, From/To shaded boxes, striped table, signature

// =====================================================

async function generateDeliveryNoteCorporatePDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 15;

  const addText = createTextHelper(pdf, colors.textOnLight);



  // ── Header bar ─────────────────────────────────────────────────

  const headerH = 46;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, headerH, 'F');



  let logoEndX = margin;

  if (settings.showLogo && company.logo) {

    try {

      const logoSizes = { small: 24, medium: 32, large: 40 };

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, margin, (headerH - dims.height) / 2, dims.width, dims.height);

      logoEndX = margin + dims.width + 6;

    } catch { }

  }

  const dn = document as DeliveryNote;

  addText(company.name.toUpperCase(), logoEndX, 14, { fontSize: 13, fontStyle: 'bold', color: colors.textOnDark });

  addText(`${company.address.street}, ${company.address.city}  |  ${company.phone}`, logoEndX, 23, { fontSize: 7.5, color: [180, 200, 220] });

  addText(company.email, logoEndX, 31, { fontSize: 7.5, color: [180, 200, 220] });

  addText('DELIVERY NOTE', pageWidth - margin, 18, { fontSize: 18, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });

  addText(`# ${document.documentNumber}`, pageWidth - margin, 29, { fontSize: 8.5, color: [180, 200, 220], align: 'right' });

  addText(`Delivery Date: ${formatDate(dn.deliveryDate)}`, pageWidth - margin, 37, { fontSize: 8, color: [180, 200, 220], align: 'right' });



  let yPos = headerH + 12;



  // ── Shipper & Consignee boxes ──────────────────────────────────

  const boxW = (pageWidth - 2 * margin - 8) / 2;

  const boxH = 52;



  // FROM (SHIPPER)

  pdf.setFillColor(248, 250, 252);

  pdf.rect(margin, yPos, boxW, boxH, 'F');

  pdf.setFillColor(...colors.primary);

  pdf.rect(margin, yPos, boxW, 8, 'F');

  addText('FROM (SHIPPER)', margin + 4, yPos + 5.5, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });

  addText(company.name, margin + 4, yPos + 15, { fontSize: 9, fontStyle: 'bold' });

  addText(company.address.street, margin + 4, yPos + 22, { fontSize: 8, color: colors.gray });

  addText(`${company.address.city}, ${company.address.state}`, margin + 4, yPos + 28, { fontSize: 8, color: colors.gray });

  addText(company.address.country, margin + 4, yPos + 34, { fontSize: 8, color: colors.gray });

  addText(`Phone: ${company.phone}`, margin + 4, yPos + 40, { fontSize: 7.5, color: colors.gray });



  // TO (CONSIGNEE)

  const toXDN = margin + boxW + 8;

  pdf.setFillColor(248, 250, 252);

  pdf.rect(toXDN, yPos, boxW, boxH, 'F');

  pdf.setFillColor(...colors.dark);

  pdf.rect(toXDN, yPos, boxW, 8, 'F');

  addText('TO (CONSIGNEE)', toXDN + 4, yPos + 5.5, { fontSize: 7.5, fontStyle: 'bold', color: [255, 255, 255] });

  let toY = yPos + 15;

  // Wrap long client names within the box
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesToY = pdf.splitTextToSize(client.name, boxW - 8) as string[];
  clientNameLinesToY.forEach((line, i) => { pdf.text(line, toXDN + 4, toY + i * 6); });
  toY += clientNameLinesToY.length * 6;

  if (client.contactPerson) { addText(client.contactPerson, toXDN + 4, toY, { fontSize: 8, color: colors.gray }); toY += 5; }

  addText(client.address.street, toXDN + 4, toY, { fontSize: 8, color: colors.gray }); toY += 5;

  addText(`${client.address.city}, ${client.address.state}`, toXDN + 4, toY, { fontSize: 8, color: colors.gray }); toY += 5;

  addText(client.address.country, toXDN + 4, toY, { fontSize: 8, color: colors.gray });



  yPos += boxH + 12;



  // ── Items table ────────────────────────────────────────────────

  const stripeFill: [number, number, number] = [

    Math.round(colors.primary[0] + (255 - colors.primary[0]) * 0.93),

    Math.round(colors.primary[1] + (255 - colors.primary[1]) * 0.93),

    Math.round(colors.primary[2] + (255 - colors.primary[2]) * 0.93),

  ];

  autoTable(pdf, {

    head: [['#', 'ITEM', 'DESCRIPTION', 'QTY ORDERED', 'QTY SHIPPED']],

    body: document.items.map((item, i) => [

      (i + 1).toString(),

      item.name,

      item.description || '-',

      item.quantity.toString(),

      item.quantity.toString(),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 9, textColor: colors.textOnLight, cellPadding: 5 },

    alternateRowStyles: { fillColor: stripeFill },

    styles: { lineColor: [220, 220, 220], lineWidth: 0.1 },

    columnStyles: {

      0: { cellWidth: 12, halign: 'center' },

      1: { cellWidth: 50, halign: 'left' },

      2: { cellWidth: 'auto', halign: 'left' },

      3: { cellWidth: 28, halign: 'center' },

      4: { cellWidth: 28, halign: 'center' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Total Items Delivered
  const totalItemsDeliveredCorp = document.items.reduce((sum, item) => sum + item.quantity, 0);
  pdf.setFillColor(...colors.dark);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');
  addText('TOTAL ITEMS DELIVERED', margin + 3, yPos + 8, { fontSize: 10, fontStyle: 'bold', color: colors.textOnDark });
  addText(totalItemsDeliveredCorp.toString(), pageWidth - margin - 3, yPos + 8, { fontSize: 10, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });
  yPos += 24;

  if (yPos > pageHeight - 80) { pdf.addPage(); yPos = margin; }



  // ── Notes (left) + Received By (right) ────────────────────────

  const halfW = (pageWidth - 2 * margin - 8) / 2;

  if (settings.showTerms && document.notes) {

    addText('NOTES', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.dark });

    const nl = pdf.splitTextToSize(document.notes, halfW - 5);

    pdf.setFontSize(8); pdf.setTextColor(...colors.gray); pdf.text(nl, margin, yPos + 7);

  }

  const sigXDN = margin + halfW + 8;

  addText('RECEIVED BY', sigXDN, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.dark });

  yPos += 18;

  pdf.setDrawColor(...colors.gray); pdf.setLineWidth(0.3);

  pdf.line(sigXDN, yPos, sigXDN + 80, yPos);

  addText('Signature', sigXDN, yPos + 6, { fontSize: 8, color: colors.gray });

  yPos += 15;

  pdf.line(sigXDN, yPos, sigXDN + 60, yPos);

  addText('Date', sigXDN, yPos + 6, { fontSize: 8, color: colors.gray });



  // ── Footer bar ─────────────────────────────────────────────────

  const fY = pageHeight - 18;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, fY - 5, pageWidth, 2, 'F');

  addText(`${company.name}  |  ${company.phone}  |  ${company.email}`, pageWidth / 2, fY, { fontSize: 7, color: colors.gray, align: 'center' });

  addText(settings.footerText || 'This document was generated electronically.', pageWidth / 2, fY + 6, { fontSize: 7, color: colors.gray, align: 'center', fontStyle: 'italic' });

}



// =====================================================

// QUOTATION — CLASSIC TEMPLATE  (image ref: clean FROM/TO, large title, white bg)

// =====================================================

async function generateQuotationClassicPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 20;

  const addText = createTextHelper(pdf, colors.textOnLight);



  let yPos = margin;



  // ── Top row: FROM left, Logo right ────────────────────────────

  addText('FROM', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary });

  yPos += 6;

  addText(company.name.toUpperCase(), margin, yPos, { fontSize: 10, fontStyle: 'bold' });

  yPos += 5;

  addText(company.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray });

  yPos += 5;

  addText(`${company.address.city}, ${company.address.state} ${company.address.postalCode}`, margin, yPos, { fontSize: 8.5, color: colors.gray });

  yPos += 5;

  if (company.tin) { addText(`Tax ID: ${company.tin}`, margin, yPos + 2, { fontSize: 8, color: colors.gray }); }



  // Logo top-right

  const logoSizes = { small: 28, medium: 38, large: 48 };

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, pageWidth - margin - dims.width, 15, dims.width, dims.height);

    } catch { }

  }



  // ── Large "QUOTE" title right-aligned ─────────────────────────

  addText('QUOTE', pageWidth - margin, 50, { fontSize: 32, fontStyle: 'bold', color: colors.primary, align: 'right' });



  yPos = 68;



  // ── Horizontal separator ───────────────────────────────────────

  pdf.setDrawColor(...colors.primary);

  pdf.setLineWidth(0.6);

  pdf.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;



  // ── TO (left) + Quote details (right) same row ─────────────────

  addText('TO', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary });

  yPos += 6;

  // Wrap long client names to stay clear of right-column quote details
  const clientNameMaxWTO = (pageWidth / 2 + 20) - margin - 5;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesTO = pdf.splitTextToSize(client.name, clientNameMaxWTO) as string[];
  clientNameLinesTO.forEach((line, i) => { pdf.text(line, margin, yPos + i * 7); });
  yPos += clientNameLinesTO.length * 7;

  addText(client.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray });

  yPos += 5;

  addText(`${client.address.city}, ${client.address.state} ${client.address.postalCode}`, margin, yPos, { fontSize: 8.5, color: colors.gray });

  yPos += 5;

  addText(client.address.country, margin, yPos, { fontSize: 8.5, color: colors.gray });



  // Quote details right

  const detX = pageWidth / 2 + 20;

  let detY = 78;

  const detRows: [string, string][] = [

    ['Quote #:', document.documentNumber],

    ['Quote Date:', formatDate(document.dateIssued)],

    ...((document as Quotation).validUntil ? [['Due Date:', formatDate((document as Quotation).validUntil)] as [string, string]] : []),

    ...(document.referenceNumber ? [['Reference:', document.referenceNumber] as [string, string]] : []),

  ];

  detRows.forEach(([label, value]) => {

    addText(label, detX, detY, { fontSize: 8.5, color: colors.primary });

    addText(value, pageWidth - margin, detY, { fontSize: 8.5, fontStyle: 'bold', align: 'right' });

    detY += 7;

  });



  yPos = 120;



  // ── Items table ────────────────────────────────────────────────

  autoTable(pdf, {

    head: [['QTY', 'Description', 'Unit Price', 'Amount']],

    body: document.items.map((item) => [

      item.quantity.toString(),

      item.name + (item.description ? `\n${item.description}` : ''),

      formatCurrency(item.unitPrice),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 9, textColor: colors.textOnLight, cellPadding: 4.5 },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: { lineColor: [220, 220, 220], lineWidth: 0.2 },

    columnStyles: {

      0: { cellWidth: 20, halign: 'center' },

      1: { cellWidth: 'auto', halign: 'left' },

      2: { cellWidth: 35, halign: 'right' },

      3: { cellWidth: 35, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }


  const rightW = 70;

  const rightX = pageWidth - margin - rightW;



  // ── Totals ────────────────────────────────────────────────────

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.2);

  const totRows: [string, string, boolean?][] = [

    ['Subtotal', formatCurrency(document.subtotal)],

    ...(document.taxType !== 'none' && document.taxPercent > 0 ? [[document.taxType === 'vat' ? `VAT (${document.taxPercent}%)` : `TOT (${document.taxPercent}%)`, formatCurrency(document.taxTotal)] as [string, string]] : []),

    ...(document.discount > 0 ? [['Discount', `- ${formatCurrency(document.discountType === 'percentage' ? document.subtotal * document.discount / 100 : document.discount)}`] as [string, string]] : []),

  ];

  totRows.forEach(([lbl, val]) => {

    addText(lbl, rightX, yPos, { fontSize: 9, color: colors.gray });

    addText(val, pageWidth - margin, yPos, { fontSize: 9, align: 'right' });

    yPos += 7;

    pdf.line(rightX, yPos - 2, pageWidth - margin, yPos - 2);

  });

  // Grand Total row with light fill

  pdf.setFillColor(245, 247, 250);

  pdf.rect(rightX - 3, yPos - 2, rightW + 3, 10, 'F');

  addText('Total', rightX, yPos + 5, { fontSize: 10, fontStyle: 'bold', color: colors.primary });

  addText(formatCurrency(document.grandTotal), pageWidth - margin, yPos + 5, { fontSize: 10, fontStyle: 'bold', color: colors.primary, align: 'right' });

  yPos += 18;



  // ── Terms & Conditions ────────────────────────────────────────


  if (yPos > pageHeight - 40) { pdf.addPage(); yPos = margin; }

  if (settings.showTerms && document.terms) {

    addText('TERMS AND CONDITIONS', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.primary });

    yPos += 6;

    document.terms.split('\n').filter(l => l.trim()).forEach((term) => {

      const wrapped = pdf.splitTextToSize(term.trim(), pageWidth - 2 * margin);

      pdf.setFontSize(8.5); pdf.setTextColor(...colors.gray); pdf.text(wrapped, margin, yPos);

      yPos += wrapped.length * 4.5 + 2;

    });

  }


  if (yPos > pageHeight - 40) { pdf.addPage(); yPos = margin; }

  if (settings.showTerms && document.notes) {

    yPos += 3;

    const nl = pdf.splitTextToSize(document.notes, pageWidth - 2 * margin);

    pdf.setFontSize(9); pdf.setTextColor(...colors.textOnLight); pdf.text(nl, margin, yPos);

  }



  // ── Footer ─────────────────────────────────────────────────────

  const fY = pageHeight - 15;

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3);

  pdf.line(margin, fY - 6, pageWidth - margin, fY - 6);

  const footParts = [

    `Tel: ${company.phone}`,

    `Email: ${company.email}`,

    ...(company.website ? [`Web: ${company.website}`] : []),

  ];

  footParts.forEach((part, idx) => {

    const x = margin + (pageWidth - 2 * margin) * (idx / footParts.length) + (pageWidth - 2 * margin) / footParts.length / 2;

    addText(part, x, fY, { fontSize: 7.5, color: colors.gray, align: 'center' });

  });

}



// =====================================================

// INVOICE — CLASSIC TEMPLATE

// =====================================================

async function generateInvoiceClassicPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 20;

  const addText = createTextHelper(pdf, colors.textOnLight);

  const inv = document as Invoice;



  let yPos = margin;



  addText('FROM', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary });

  yPos += 6;

  addText(company.name.toUpperCase(), margin, yPos, { fontSize: 10, fontStyle: 'bold' });

  yPos += 5;

  addText(company.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`${company.address.city}, ${company.address.state} ${company.address.postalCode}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  if (company.tin) addText(`Tax ID: ${company.tin}`, margin, yPos, { fontSize: 8, color: colors.gray });



  const logoSizes = { small: 28, medium: 38, large: 48 };

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, pageWidth - margin - dims.width, 15, dims.width, dims.height);

    } catch { }

  }



  addText('INVOICE', pageWidth - margin, 50, { fontSize: 32, fontStyle: 'bold', color: colors.primary, align: 'right' });



  yPos = 68;

  pdf.setDrawColor(...colors.primary); pdf.setLineWidth(0.6);

  pdf.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;



  addText('BILL TO', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary }); yPos += 6;

  // Wrap long client names to stay clear of right-column invoice details
  const clientNameMaxWBill = (pageWidth / 2 + 20) - margin - 5;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesBill2 = pdf.splitTextToSize(client.name, clientNameMaxWBill) as string[];
  clientNameLinesBill2.forEach((line, i) => { pdf.text(line, margin, yPos + i * 7); });
  yPos += clientNameLinesBill2.length * 7;

  if (client.contactPerson) { addText(client.contactPerson, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5; }

  addText(client.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`${client.address.city}, ${client.address.state}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(client.address.country, margin, yPos, { fontSize: 8.5, color: colors.gray });



  const detX = pageWidth / 2 + 20; let detY = 78;

  const detRows: [string, string][] = [

    ['Invoice #:', document.documentNumber],

    ['Invoice Date:', formatDate(document.dateIssued)],

    ...(inv.dueDate ? [['Due Date:', formatDate(inv.dueDate)] as [string, string]] : []),

    ...(document.referenceNumber ? [['Reference:', document.referenceNumber] as [string, string]] : []),

  ];

  detRows.forEach(([lbl, val]) => {

    addText(lbl, detX, detY, { fontSize: 8.5, color: colors.primary });

    addText(val, pageWidth - margin, detY, { fontSize: 8.5, fontStyle: 'bold', align: 'right' });

    detY += 7;

  });



  yPos = 120;

  autoTable(pdf, {

    head: [['QTY', 'Description', 'Unit Price', 'Amount']],

    body: document.items.map((item) => [

      item.quantity.toString(),

      item.name + (item.description ? `\n${item.description}` : ''),

      formatCurrency(item.unitPrice),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 9, textColor: colors.textOnLight, cellPadding: 4.5 },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: { lineColor: [220, 220, 220], lineWidth: 0.2 },

    columnStyles: {

      0: { cellWidth: 20, halign: 'center' },

      1: { cellWidth: 'auto', halign: 'left' },

      2: { cellWidth: 35, halign: 'right' },

      3: { cellWidth: 35, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }


  const rightW = 70; const rightX = pageWidth - margin - rightW;

  const totRows: [string, string][] = [

    ['Subtotal', formatCurrency(document.subtotal)],

    ...(document.taxType !== 'none' && document.taxPercent > 0 ? [[document.taxType === 'vat' ? `VAT (${document.taxPercent}%)` : `TOT (${document.taxPercent}%)`, formatCurrency(document.taxTotal)] as [string, string]] : []),

    ...(document.discount > 0 ? [['Discount', `- ${formatCurrency(document.discountType === 'percentage' ? document.subtotal * document.discount / 100 : document.discount)}`] as [string, string]] : []),

  ];

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.2);

  totRows.forEach(([lbl, val]) => {

    addText(lbl, rightX, yPos, { fontSize: 9, color: colors.gray });

    addText(val, pageWidth - margin, yPos, { fontSize: 9, align: 'right' });

    yPos += 7; pdf.line(rightX, yPos - 2, pageWidth - margin, yPos - 2);

  });

  pdf.setFillColor(245, 247, 250);

  pdf.rect(rightX - 3, yPos - 2, rightW + 3, 10, 'F');

  addText('Total', rightX, yPos + 5, { fontSize: 10, fontStyle: 'bold', color: colors.primary });

  addText(formatCurrency(document.grandTotal), pageWidth - margin, yPos + 5, { fontSize: 10, fontStyle: 'bold', color: colors.primary, align: 'right' });

  yPos += 18;




  if (yPos > pageHeight - 40) { pdf.addPage(); yPos = margin; }

  if (settings.showBankInfo && company.bankInfo) {

    addText('PAYMENT METHOD', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.primary }); yPos += 6;

    [['Account No:', company.bankInfo.accountNumber], ['Account Name:', company.bankInfo.accountName], ['Bank Name:', company.bankInfo.bankName]].forEach(([lbl, val]) => {

      addText(`${lbl}  ${val}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

    });

    yPos += 4;

  }




  if (yPos > pageHeight - 40) { pdf.addPage(); yPos = margin; }

  if (settings.showTerms && document.terms) {

    addText('TERMS AND CONDITIONS', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.primary }); yPos += 6;

    document.terms.split('\n').filter(l => l.trim()).forEach((term) => {

      const wrapped = pdf.splitTextToSize(term.trim(), pageWidth - 2 * margin);

      pdf.setFontSize(8.5); pdf.setTextColor(...colors.gray); pdf.text(wrapped, margin, yPos);

      yPos += wrapped.length * 4.5 + 2;

    });

  }



  const fY = pageHeight - 15;

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3);

  pdf.line(margin, fY - 6, pageWidth - margin, fY - 6);

  const footParts = [`Tel: ${company.phone}`, `Email: ${company.email}`, ...(company.website ? [`Web: ${company.website}`] : [])];

  footParts.forEach((part, idx) => {

    const x = margin + (pageWidth - 2 * margin) * (idx / footParts.length) + (pageWidth - 2 * margin) / footParts.length / 2;

    addText(part, x, fY, { fontSize: 7.5, color: colors.gray, align: 'center' });

  });

}



// =====================================================

// PURCHASE ORDER — CLASSIC TEMPLATE

// =====================================================

async function generatePurchaseOrderClassicPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 20;

  const addText = createTextHelper(pdf, colors.textOnLight);

  const po = document as PurchaseOrder;



  let yPos = margin;



  addText('FROM', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary }); yPos += 6;

  addText(company.name.toUpperCase(), margin, yPos, { fontSize: 10, fontStyle: 'bold' }); yPos += 5;

  addText(company.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`${company.address.city}, ${company.address.state} ${company.address.postalCode}`, margin, yPos, { fontSize: 8.5, color: colors.gray });



  const logoSizes = { small: 28, medium: 38, large: 48 };

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, pageWidth - margin - dims.width, 15, dims.width, dims.height);

    } catch { }

  }



  addText('PURCHASE ORDER', pageWidth - margin, 50, { fontSize: 22, fontStyle: 'bold', color: colors.primary, align: 'right' });



  yPos = 68;

  pdf.setDrawColor(...colors.primary); pdf.setLineWidth(0.6);

  pdf.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;



  addText('VENDOR', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary }); yPos += 6;

  // Wrap long vendor names to stay clear of right-column order details
  const clientNameMaxWVend2 = (pageWidth / 2 + 20) - margin - 5;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesVend2 = pdf.splitTextToSize(client.name, clientNameMaxWVend2) as string[];
  clientNameLinesVend2.forEach((line, i) => { pdf.text(line, margin, yPos + i * 7); });
  yPos += clientNameLinesVend2.length * 7;

  addText(client.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`${client.address.city}, ${client.address.state}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(client.address.country, margin, yPos, { fontSize: 8.5, color: colors.gray });



  const detX = pageWidth / 2 + 20; let detY = 78;

  const detRows: [string, string][] = [

    ['Order No.:', document.documentNumber],

    ['Order Date:', formatDate(document.dateIssued)],

    ...(po.expectedDeliveryDate ? [['Expected:', formatDate(po.expectedDeliveryDate)] as [string, string]] : []),

    ...(po.shippingMethod ? [['Shipping:', po.shippingMethod] as [string, string]] : []),

  ];

  detRows.forEach(([lbl, val]) => {

    addText(lbl, detX, detY, { fontSize: 8.5, color: colors.primary });

    addText(val, pageWidth - margin, detY, { fontSize: 8.5, fontStyle: 'bold', align: 'right' });

    detY += 7;

  });



  yPos = 120;

  autoTable(pdf, {

    head: [['QTY', 'Description', 'Unit Price', 'Amount']],

    body: document.items.map((item) => [

      item.quantity.toString(),

      item.name + (item.description ? `\n${item.description}` : ''),

      formatCurrency(item.unitPrice),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 9, textColor: colors.textOnLight, cellPadding: 4.5 },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: { lineColor: [220, 220, 220], lineWidth: 0.2 },

    columnStyles: {

      0: { cellWidth: 20, halign: 'center' },

      1: { cellWidth: 'auto', halign: 'left' },

      2: { cellWidth: 35, halign: 'right' },

      3: { cellWidth: 35, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }


  const rightW = 70; const rightX = pageWidth - margin - rightW;

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.2);

  [['Subtotal', formatCurrency(document.subtotal)], ...(document.taxType !== 'none' && document.taxPercent > 0 ? [[document.taxType === 'vat' ? `VAT (${document.taxPercent}%)` : `TOT (${document.taxPercent}%)`, formatCurrency(document.taxTotal)]] : [])].forEach(([lbl, val]) => {

    addText(lbl as string, rightX, yPos, { fontSize: 9, color: colors.gray });

    addText(val as string, pageWidth - margin, yPos, { fontSize: 9, align: 'right' });

    yPos += 7; pdf.line(rightX, yPos - 2, pageWidth - margin, yPos - 2);

  });

  pdf.setFillColor(245, 247, 250);

  pdf.rect(rightX - 3, yPos - 2, rightW + 3, 10, 'F');

  addText('Total Due', rightX, yPos + 5, { fontSize: 10, fontStyle: 'bold', color: colors.primary });

  addText(formatCurrency(document.grandTotal), pageWidth - margin, yPos + 5, { fontSize: 10, fontStyle: 'bold', color: colors.primary, align: 'right' });

  yPos += 18;




  if (yPos > pageHeight - 40) { pdf.addPage(); yPos = margin; }

  if (settings.showTerms && document.notes) {

    addText('NOTES', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.primary }); yPos += 6;

    const nl = pdf.splitTextToSize(document.notes, pageWidth - 2 * margin);

    pdf.setFontSize(8.5); pdf.setTextColor(...colors.gray); pdf.text(nl, margin, yPos); yPos += nl.length * 4.5 + 4;

  }


  if (yPos > pageHeight - 40) { pdf.addPage(); yPos = margin; }

  if (settings.showTerms && document.terms) {

    addText('TERMS AND CONDITIONS', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.primary }); yPos += 6;

    document.terms.split('\n').filter(l => l.trim()).forEach((term) => {

      const wrapped = pdf.splitTextToSize(term.trim(), pageWidth - 2 * margin);

      pdf.setFontSize(8.5); pdf.setTextColor(...colors.gray); pdf.text(wrapped, margin, yPos);

      yPos += wrapped.length * 4.5 + 2;

    });

  }



  const fY = pageHeight - 15;

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3);

  pdf.line(margin, fY - 6, pageWidth - margin, fY - 6);

  const footParts = [`Tel: ${company.phone}`, `Email: ${company.email}`, ...(company.website ? [`Web: ${company.website}`] : [])];

  footParts.forEach((part, idx) => {

    const x = margin + (pageWidth - 2 * margin) * (idx / footParts.length) + (pageWidth - 2 * margin) / footParts.length / 2;

    addText(part, x, fY, { fontSize: 7.5, color: colors.gray, align: 'center' });

  });

}



// =====================================================

// DELIVERY NOTE — CLASSIC TEMPLATE

// =====================================================

async function generateDeliveryNoteClassicPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 20;

  const addText = createTextHelper(pdf, colors.textOnLight);

  const dn = document as DeliveryNote;



  let yPos = margin;



  addText('FROM', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary }); yPos += 6;

  addText(company.name.toUpperCase(), margin, yPos, { fontSize: 10, fontStyle: 'bold' }); yPos += 5;

  addText(company.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`${company.address.city}, ${company.address.state}`, margin, yPos, { fontSize: 8.5, color: colors.gray });



  const logoSizes = { small: 28, medium: 38, large: 48 };

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, pageWidth - margin - dims.width, 15, dims.width, dims.height);

    } catch { }

  }



  addText('DELIVERY NOTE', pageWidth - margin, 50, { fontSize: 22, fontStyle: 'bold', color: colors.primary, align: 'right' });



  yPos = 68;

  pdf.setDrawColor(...colors.primary); pdf.setLineWidth(0.6);

  pdf.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;



  addText('DELIVER TO', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary }); yPos += 6;

  // Wrap long client names to stay clear of right-column delivery note details
  const clientNameMaxWDel2 = (pageWidth / 2 + 20) - margin - 5;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...colors.textOnLight);
  const clientNameLinesDel2 = pdf.splitTextToSize(client.name, clientNameMaxWDel2) as string[];
  clientNameLinesDel2.forEach((line, i) => { pdf.text(line, margin, yPos + i * 7); });
  yPos += clientNameLinesDel2.length * 7;

  if (client.contactPerson) { addText(client.contactPerson, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5; }

  addText(client.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`${client.address.city}, ${client.address.state}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(client.address.country, margin, yPos, { fontSize: 8.5, color: colors.gray });



  const detX = pageWidth / 2 + 20; let detY = 78;

  const detRows: [string, string][] = [

    ['Delivery Note #:', document.documentNumber],

    ['Delivery Date:', formatDate(dn.deliveryDate)],

    ...(document.referenceNumber ? [['Reference:', document.referenceNumber] as [string, string]] : []),

    ...(dn.receivedBy ? [['Received By:', dn.receivedBy] as [string, string]] : []),

  ];

  detRows.forEach(([lbl, val]) => {

    addText(lbl, detX, detY, { fontSize: 8.5, color: colors.primary });

    addText(val, pageWidth - margin, detY, { fontSize: 8.5, fontStyle: 'bold', align: 'right' });

    detY += 7;

  });



  yPos = 120;

  autoTable(pdf, {

    head: [['#', 'Item', 'Description', 'Qty Ordered', 'Qty Shipped']],

    body: document.items.map((item, i) => [

      (i + 1).toString(),

      item.name,

      item.description || '-',

      item.quantity.toString(),

      item.quantity.toString(),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 9, textColor: colors.textOnLight, cellPadding: 4.5 },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: { lineColor: [220, 220, 220], lineWidth: 0.2 },

    columnStyles: {

      0: { cellWidth: 12, halign: 'center' },

      1: { cellWidth: 45, halign: 'left' },

      2: { cellWidth: 'auto', halign: 'left' },

      3: { cellWidth: 28, halign: 'center' },

      4: { cellWidth: 28, halign: 'center' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Total Items Delivered
  const totalItemsDeliveredClassic = document.items.reduce((sum, item) => sum + item.quantity, 0);
  pdf.setFillColor(...colors.dark);
  pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');
  addText('TOTAL ITEMS DELIVERED', margin + 3, yPos + 8, { fontSize: 10, fontStyle: 'bold', color: colors.textOnDark });
  addText(totalItemsDeliveredClassic.toString(), pageWidth - margin - 3, yPos + 8, { fontSize: 10, fontStyle: 'bold', color: colors.textOnDark, align: 'right' });
  yPos += 24;

  if (yPos > pageHeight - 60) { pdf.addPage(); yPos = margin; }



  if (settings.showTerms && document.notes) {

    addText('Notes:', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.primary }); yPos += 6;

    const nl = pdf.splitTextToSize(document.notes, pageWidth - 2 * margin);

    pdf.setFontSize(8.5); pdf.setTextColor(...colors.gray); pdf.text(nl, margin, yPos); yPos += nl.length * 4.5 + 8;

  }



  addText('RECEIVED BY', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.primary }); yPos += 14;

  pdf.setDrawColor(...colors.gray); pdf.setLineWidth(0.3);

  pdf.line(margin, yPos, margin + 70, yPos);

  addText('Signature', margin, yPos + 6, { fontSize: 8, color: colors.gray });

  pdf.line(margin + 90, yPos, margin + 150, yPos);

  addText('Date', margin + 90, yPos + 6, { fontSize: 8, color: colors.gray });



  const fY = pageHeight - 15;

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.3);

  pdf.line(margin, fY - 6, pageWidth - margin, fY - 6);

  const footParts = [`Tel: ${company.phone}`, `Email: ${company.email}`, ...(company.website ? [`Web: ${company.website}`] : [])];

  footParts.forEach((part, idx) => {

    const x = margin + (pageWidth - 2 * margin) * (idx / footParts.length) + (pageWidth - 2 * margin) / footParts.length / 2;

    addText(part, x, fY, { fontSize: 7.5, color: colors.gray, align: 'center' });

  });

}



// =====================================================

// QUOTATION — MODERN TEMPLATE  (dark header + accent stripe + prominent totals)

// =====================================================

async function generateQuotationModernPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 18;

  const addText = createTextHelper(pdf, colors.textOnLight);



  // ── Dark header ───────────────────────────────────────────────

  const headerH = 42;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, headerH, 'F');



  let logoEndX = margin;

  if (settings.showLogo && company.logo) {

    try {

      const logoSizes = { small: 20, medium: 28, large: 36 };

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, margin, (headerH - dims.height) / 2, dims.width, dims.height);

      logoEndX = margin + dims.width + 5;

    } catch { }

  }

  addText(company.name.toUpperCase(), logoEndX, headerH / 2 - 2, { fontSize: 11, fontStyle: 'bold', color: colors.textOnDark });

  if (company.website) addText(company.website, logoEndX, headerH / 2 + 5, { fontSize: 7, color: [160, 180, 200] });

  addText('QUOTE', pageWidth - margin, headerH / 2 + 4, { fontSize: 26, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });



  // ── Accent stripe ─────────────────────────────────────────────

  pdf.setFillColor(...colors.primary);

  pdf.rect(0, headerH, pageWidth * 0.6, 3, 'F');

  pdf.setFillColor(...colors.dark);

  pdf.rect(pageWidth * 0.6, headerH, pageWidth * 0.4, 3, 'F');



  let yPos = headerH + 14;



  // ── QUOTE TO + Total ──────────────────────────────────────────

  addText('QUOTE TO:', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary });

  yPos += 6;

  // Wrap long client names to prevent overlap with right-column quote details
  const clientNameMaxW = pageWidth / 2 - margin - 5;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.textOnLight);
  const clientNameLines = pdf.splitTextToSize(client.name, clientNameMaxW) as string[];
  clientNameLines.forEach((line, i) => { pdf.text(line, margin, yPos + i * 7); });
  yPos += clientNameLines.length * 7;

  if (client.contactPerson) { addText(client.contactPerson, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5; }

  addText(`Phone: ${client.phone}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`Email: ${client.email}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`Address: ${client.address.street}, ${client.address.city}`, margin, yPos, { fontSize: 8.5, color: colors.gray });



  // Right: Quote details

  const rightInfoX = pageWidth / 2 + 15;

  let rY = headerH + 14;

  const docRows: [string, string][] = [

    ['Quote No.:', document.documentNumber],

    ['Quote Date:', formatDate(document.dateIssued)],

    ...((document as Quotation).validUntil ? [['Valid Until:', formatDate((document as Quotation).validUntil)] as [string, string]] : []),

  ];

  docRows.forEach(([lbl, val]) => {

    addText(lbl, rightInfoX, rY, { fontSize: 8, color: colors.gray });

    addText(val, pageWidth - margin, rY, { fontSize: 8, fontStyle: 'bold', align: 'right' });

    rY += 6;

  });



  yPos = headerH + 58;



  // ── Items table (split header style) ─────────────────────────

  autoTable(pdf, {

    head: [['Item Description', 'Price', 'QTY', 'Total']],

    body: document.items.map((item) => [

      { content: item.name + (item.description ? `\n${item.description}` : ''), styles: { fontStyle: 'bold' as const } },

      formatCurrency(item.unitPrice),

      item.quantity.toString(),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 8.5, textColor: colors.textOnLight, cellPadding: 5 },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: { lineColor: [235, 235, 235], lineWidth: 0.3 },

    columnStyles: {

      0: { cellWidth: 'auto', halign: 'left' },

      1: { cellWidth: 30, halign: 'right' },

      2: { cellWidth: 22, halign: 'center' },

      3: { cellWidth: 32, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  const bottomY = yPos;

  const rightW = 70; const rightX = pageWidth - margin - rightW;



  // ── Left: Terms ───────────────────────────────────────────────

  if (settings.showTerms && document.terms) {

    addText('Terms & Conditions:', margin, bottomY, { fontSize: 9, fontStyle: 'bold' });

    let ty = bottomY + 6;

    document.terms.split('\n').filter(l => l.trim()).forEach((term) => {

      const wrapped = pdf.splitTextToSize(term.trim(), rightX - margin - 8);

      pdf.setFontSize(8); pdf.setTextColor(...colors.gray); pdf.text(wrapped, margin, ty);

      ty += wrapped.length * 4.5 + 2;

    });

  }



  // ── Right: Totals ─────────────────────────────────────────────

  let totY = bottomY;

  pdf.setDrawColor(230, 230, 230); pdf.setLineWidth(0.2);

  [

    ['Subtotal:', formatCurrency(document.subtotal)],

    ...(document.taxType !== 'none' && document.taxPercent > 0 ? [[document.taxType === 'vat' ? `VAT (${document.taxPercent}%):` : `TOT (${document.taxPercent}%):`, formatCurrency(document.taxTotal)]] : []),

    ...(document.discount > 0 ? [['Discount:', `- ${formatCurrency(document.discountType === 'percentage' ? document.subtotal * document.discount / 100 : document.discount)}`]] : []),

  ].forEach(([lbl, val]) => {

    addText(lbl as string, rightX, totY, { fontSize: 8.5, color: colors.gray });

    addText(val as string, pageWidth - margin, totY, { fontSize: 8.5, align: 'right' });

    totY += 7; pdf.line(rightX, totY - 2, pageWidth - margin, totY - 2);

  });

  pdf.setFillColor(...colors.dark);

  pdf.rect(rightX - 3, totY - 2, rightW + 3, 12, 'F');

  addText('Total:', rightX + 2, totY + 6, { fontSize: 10, fontStyle: 'bold', color: [255, 255, 255] });

  addText(formatCurrency(document.grandTotal), pageWidth - margin - 2, totY + 6, { fontSize: 11, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });

  totY += 20;

  addText('Your Name & Signature', pageWidth - margin, totY, { fontSize: 8.5, color: colors.gray, align: 'right' });

  pdf.setDrawColor(...colors.gray); pdf.setLineWidth(0.3);

  pdf.line(pageWidth - margin - 55, totY - 4, pageWidth - margin, totY - 4);


  // ── Notes ──────────────────────────────────────────────────────────────

  if (document.notes && document.notes.trim()) {

    const noteLines = pdf.splitTextToSize(document.notes.trim(), pageWidth - margin * 2 - 10);

    const notesBlockH = 18 + noteLines.length * 10;

    let notesStartY = Math.max(totY + 12, bottomY + 4);

    if (notesStartY + notesBlockH > pageHeight - 28) {

      pdf.addPage();

      notesStartY = margin + 10;

    }

    pdf.setFillColor(...colors.primary);

    pdf.rect(margin, notesStartY, 3, 11, 'F');

    addText('Notes', margin + 7, notesStartY + 7.5, { fontSize: 9, fontStyle: 'bold', color: colors.dark });

    pdf.setFontSize(8.5);

    pdf.setTextColor(...colors.gray);

    pdf.text(noteLines, margin + 7, notesStartY + 15);

  }



  // ── Footer ─────────────────────────────────────────────────────

  const fY = pageHeight - 16;

  pdf.setFillColor(...colors.primary);

  pdf.rect(0, fY - 7, pageWidth, 0.5, 'F');

  const footItems = [

    `Tel: ${company.phone}`,

    `Email: ${company.email}`,

    ...(company.website ? [`Web: ${company.website}`] : []),

  ];

  const footAreaW = pageWidth * 0.52;

  const segW = footAreaW / footItems.length;

  footItems.forEach((part, idx) => addText(part, margin + segW * idx + segW / 2, fY, { fontSize: 7.5, color: colors.gray, align: 'center' }));

  addText('Thank You For Your Business', pageWidth - margin, fY, { fontSize: 8, fontStyle: 'bold', color: colors.dark, align: 'right' });

}



// =====================================================

// INVOICE — MODERN TEMPLATE

// =====================================================

async function generateInvoiceModernPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 18;

  const addText = createTextHelper(pdf, colors.textOnLight);

  const inv = document as Invoice;



  // ── Dark header ───────────────────────────────────────────────

  const headerH = 42;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, headerH, 'F');



  let logoEndX = margin;

  if (settings.showLogo && company.logo) {

    try {

      const logoSizes = { small: 20, medium: 28, large: 36 };

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, margin, (headerH - dims.height) / 2, dims.width, dims.height);

      logoEndX = margin + dims.width + 5;

    } catch { }

  }

  addText(company.name.toUpperCase(), logoEndX, headerH / 2 - 2, { fontSize: 11, fontStyle: 'bold', color: colors.textOnDark });

  if (company.website) addText(company.website, logoEndX, headerH / 2 + 5, { fontSize: 7, color: [160, 180, 200] });

  addText('INVOICE', pageWidth - margin, headerH / 2 + 4, { fontSize: 26, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });



  pdf.setFillColor(...colors.primary);

  pdf.rect(0, headerH, pageWidth * 0.6, 3, 'F');

  pdf.setFillColor(...colors.dark);

  pdf.rect(pageWidth * 0.6, headerH, pageWidth * 0.4, 3, 'F');



  let yPos = headerH + 14;



  // ── INVOICE TO + Total Due ────────────────────────────────────

  addText('INVOICE TO:', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary }); yPos += 6;

  // Wrap long client names to prevent overlap with right-column invoice details
  const clientNameMaxW = pageWidth / 2 - margin - 5;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.textOnLight);
  const clientNameLines = pdf.splitTextToSize(client.name, clientNameMaxW) as string[];
  clientNameLines.forEach((line, i) => { pdf.text(line, margin, yPos + i * 7); });
  yPos += clientNameLines.length * 7;

  if (client.contactPerson) { addText(client.contactPerson, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5; }

  addText(`Phone: ${client.phone}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`Email: ${client.email}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`Address: ${client.address.street}, ${client.address.city}`, margin, yPos, { fontSize: 8.5, color: colors.gray });



  const rightInfoX = pageWidth / 2 + 15;

  let rY = headerH + 14;

  const docRows: [string, string][] = [

    ['Invoice No.:', document.documentNumber],

    ['Invoice Date:', formatDate(document.dateIssued)],

    ...(inv.dueDate ? [['Due Date:', formatDate(inv.dueDate)] as [string, string]] : []),

  ];

  docRows.forEach(([lbl, val]) => {

    addText(lbl, rightInfoX, rY, { fontSize: 8, color: colors.gray });

    addText(val, pageWidth - margin, rY, { fontSize: 8, fontStyle: 'bold', align: 'right' });

    rY += 6;

  });



  yPos = headerH + 78;



  // ── Items table ───────────────────────────────────────────────

  autoTable(pdf, {

    head: [['Product Description', 'Price', 'QTY', 'Total']],

    body: document.items.map((item) => [

      { content: item.name + (item.description ? `\n${item.description}` : ''), styles: { fontStyle: 'bold' as const } },

      formatCurrency(item.unitPrice),

      item.quantity.toString(),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 8.5, textColor: colors.textOnLight, cellPadding: 5 },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: { lineColor: [235, 235, 235], lineWidth: 0.3 },

    columnStyles: {

      0: { cellWidth: 'auto', halign: 'left' },

      1: { cellWidth: 28, halign: 'right' },

      2: { cellWidth: 22, halign: 'center' },

      3: { cellWidth: 30, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }


  const bottomY = yPos;

  const rightW = 70; const rightX = pageWidth - margin - rightW;



  // ── Left: Payment Method + Terms ─────────────────────────────

  let leftY = bottomY;

  if (settings.showBankInfo && company.bankInfo) {

    addText('Payment Method', margin, leftY, { fontSize: 9, fontStyle: 'bold', color: colors.primary }); leftY += 6;

    [['Account No:', company.bankInfo.accountNumber], ['Account Name:', company.bankInfo.accountName], ['Branch Name:', company.bankInfo.bankName]].forEach(([lbl, val]) => {

      addText(lbl, margin, leftY, { fontSize: 8, color: colors.gray });

      addText(val, margin + 28, leftY, { fontSize: 8 });

      leftY += 5;

    });

    leftY += 5;

  }

  if (settings.showTerms && document.terms) {

    addText('Terms & Conditions:', margin, leftY, { fontSize: 9, fontStyle: 'bold' }); leftY += 5;

    const tl = pdf.splitTextToSize(document.terms, rightX - margin - 8);

    pdf.setFontSize(8); pdf.setTextColor(...colors.gray); pdf.text(tl, margin, leftY);

  }



  // ── Right: Totals ─────────────────────────────────────────────

  let totY = bottomY;

  pdf.setDrawColor(230, 230, 230); pdf.setLineWidth(0.2);

  [

    ['Subtotal:', formatCurrency(document.subtotal)],

    ...(document.taxType !== 'none' && document.taxPercent > 0 ? [[document.taxType === 'vat' ? `VAT (${document.taxPercent}%):` : `TOT (${document.taxPercent}%):`, formatCurrency(document.taxTotal)]] : []),

    ...(document.discount > 0 ? [['Discount:', `- ${formatCurrency(document.discountType === 'percentage' ? document.subtotal * document.discount / 100 : document.discount)}`]] : []),

  ].forEach(([lbl, val]) => {

    addText(lbl as string, rightX, totY, { fontSize: 8.5, color: colors.gray });

    addText(val as string, pageWidth - margin, totY, { fontSize: 8.5, align: 'right' });

    totY += 7; pdf.line(rightX, totY - 2, pageWidth - margin, totY - 2);

  });

  pdf.setFillColor(...colors.dark);

  pdf.rect(rightX - 3, totY - 2, rightW + 3, 12, 'F');

  addText('Total:', rightX + 2, totY + 6, { fontSize: 10, fontStyle: 'bold', color: [255, 255, 255] });

  addText(formatCurrency(document.grandTotal), pageWidth - margin - 2, totY + 6, { fontSize: 11, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });

  totY += 20;

  addText('Your Name & Signature', pageWidth - margin, totY, { fontSize: 8.5, color: colors.gray, align: 'right' });

  pdf.setDrawColor(...colors.gray); pdf.setLineWidth(0.3);

  pdf.line(pageWidth - margin - 55, totY - 4, pageWidth - margin, totY - 4);



  // ── Footer ─────────────────────────────────────────────────────

  const fY = pageHeight - 16;

  pdf.setFillColor(...colors.primary);

  pdf.rect(0, fY - 7, pageWidth, 0.5, 'F');

  const footItems = [`Tel: ${company.phone}`, `Email: ${company.email}`, ...(company.website ? [`Web: ${company.website}`] : [])];

  const footAreaW = pageWidth * 0.52;

  const segW = footAreaW / footItems.length;

  footItems.forEach((part, idx) => addText(part, margin + segW * idx + segW / 2, fY, { fontSize: 7.5, color: colors.gray, align: 'center' }));

  addText('Thank You For Your Business', pageWidth - margin, fY, { fontSize: 8, fontStyle: 'bold', color: colors.dark, align: 'right' });

}



// =====================================================

// PURCHASE ORDER — MODERN TEMPLATE

// =====================================================

async function generatePurchaseOrderModernPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 18;

  const addText = createTextHelper(pdf, colors.textOnLight);

  const po = document as PurchaseOrder;



  const headerH = 42;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, headerH, 'F');



  let logoEndX = margin;

  if (settings.showLogo && company.logo) {

    try {

      const logoSizes = { small: 20, medium: 28, large: 36 };

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, margin, (headerH - dims.height) / 2, dims.width, dims.height);

      logoEndX = margin + dims.width + 5;

    } catch { }

  }

  addText(company.name.toUpperCase(), logoEndX, headerH / 2 - 2, { fontSize: 11, fontStyle: 'bold', color: colors.textOnDark });

  if (company.website) addText(company.website, logoEndX, headerH / 2 + 5, { fontSize: 7, color: [160, 180, 200] });

  addText('PURCHASE ORDER', pageWidth - margin, headerH / 2 + 4, { fontSize: 18, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });



  pdf.setFillColor(...colors.primary);

  pdf.rect(0, headerH, pageWidth * 0.6, 3, 'F');

  pdf.setFillColor(...colors.dark);

  pdf.rect(pageWidth * 0.6, headerH, pageWidth * 0.4, 3, 'F');



  let yPos = headerH + 14;

  addText('VENDOR:', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary }); yPos += 6;

  // Wrap long vendor names to prevent overlap with right-column PO details
  const clientNameMaxW = pageWidth / 2 - margin - 5;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.textOnLight);
  const clientNameLines = pdf.splitTextToSize(client.name, clientNameMaxW) as string[];
  clientNameLines.forEach((line, i) => { pdf.text(line, margin, yPos + i * 7); });
  yPos += clientNameLines.length * 7;

  addText(client.address.street, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`${client.address.city}, ${client.address.state}, ${client.address.country}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  if (client.email) addText(`Email: ${client.email}`, margin, yPos, { fontSize: 8.5, color: colors.gray });



  const rightInfoX = pageWidth / 2 + 15;

  let rY = headerH + 14;

  addText('Total Amount', rightInfoX, rY, { fontSize: 8.5, color: colors.gray }); rY += 7;

  addText(formatCurrency(document.grandTotal), rightInfoX, rY, { fontSize: 18, fontStyle: 'bold', color: colors.primary }); rY += 10;

  const docRows: [string, string][] = [

    ['Order No.:', document.documentNumber],

    ['Order Date:', formatDate(document.dateIssued)],

    ...(po.expectedDeliveryDate ? [['Expected:', formatDate(po.expectedDeliveryDate)] as [string, string]] : []),

    ...(po.shippingMethod ? [['Shipping:', po.shippingMethod] as [string, string]] : []),

  ];

  docRows.forEach(([lbl, val]) => {

    addText(lbl, rightInfoX, rY, { fontSize: 8, color: colors.gray });

    addText(val, pageWidth - margin, rY, { fontSize: 8, fontStyle: 'bold', align: 'right' });

    rY += 6;

  });



  yPos = headerH + 78;

  autoTable(pdf, {

    head: [['Item Description', 'Unit Price', 'QTY', 'Total']],

    body: document.items.map((item) => [

      { content: item.name + (item.description ? `\n${item.description}` : ''), styles: { fontStyle: 'bold' as const } },

      formatCurrency(item.unitPrice),

      item.quantity.toString(),

      formatCurrency(item.total),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 8.5, textColor: colors.textOnLight, cellPadding: 5 },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: { lineColor: [235, 235, 235], lineWidth: 0.3 },

    columnStyles: {

      0: { cellWidth: 'auto', halign: 'left' },

      1: { cellWidth: 30, halign: 'right' },

      2: { cellWidth: 22, halign: 'center' },

      3: { cellWidth: 30, halign: 'right' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (yPos > pageHeight - 90) { pdf.addPage(); yPos = margin; }


  const bottomY = yPos;

  const rightW = 70; const rightX = pageWidth - margin - rightW;



  if (settings.showTerms && document.notes) {

    addText('Notes:', margin, bottomY, { fontSize: 9, fontStyle: 'bold' });

    const nl = pdf.splitTextToSize(document.notes, rightX - margin - 8);

    pdf.setFontSize(8); pdf.setTextColor(...colors.gray); pdf.text(nl, margin, bottomY + 6);

  }



  let totY = bottomY;

  pdf.setDrawColor(230, 230, 230); pdf.setLineWidth(0.2);

  [

    ['Subtotal:', formatCurrency(document.subtotal)],

    ...(document.taxType !== 'none' && document.taxPercent > 0 ? [[document.taxType === 'vat' ? `VAT (${document.taxPercent}%):` : `TOT (${document.taxPercent}%):`, formatCurrency(document.taxTotal)]] : []),

    ...(document.discount > 0 ? [['Discount:', `- ${formatCurrency(document.discountType === 'percentage' ? document.subtotal * document.discount / 100 : document.discount)}`]] : []),

  ].forEach(([lbl, val]) => {

    addText(lbl as string, rightX, totY, { fontSize: 8.5, color: colors.gray });

    addText(val as string, pageWidth - margin, totY, { fontSize: 8.5, align: 'right' });

    totY += 7; pdf.line(rightX, totY - 2, pageWidth - margin, totY - 2);

  });

  pdf.setFillColor(...colors.dark);

  pdf.rect(rightX - 3, totY - 2, rightW + 3, 12, 'F');

  addText('Total Due:', rightX + 2, totY + 6, { fontSize: 10, fontStyle: 'bold', color: [255, 255, 255] });

  addText(formatCurrency(document.grandTotal), pageWidth - margin - 2, totY + 6, { fontSize: 11, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });

  totY += 20;

  addText('Issued by, signature', pageWidth - margin, totY, { fontSize: 8.5, color: colors.gray, fontStyle: 'italic', align: 'right' });

  pdf.setDrawColor(...colors.gray); pdf.setLineWidth(0.3);

  pdf.line(pageWidth - margin - 55, totY - 4, pageWidth - margin, totY - 4);



  const fY = pageHeight - 16;

  pdf.setFillColor(...colors.primary);

  pdf.rect(0, fY - 7, pageWidth, 0.5, 'F');

  const footItems = [`Tel: ${company.phone}`, `Email: ${company.email}`, ...(company.website ? [`Web: ${company.website}`] : [])];

  const footAreaW = pageWidth * 0.52;

  const segW = footAreaW / footItems.length;

  footItems.forEach((part, idx) => addText(part, margin + segW * idx + segW / 2, fY, { fontSize: 7.5, color: colors.gray, align: 'center' }));

  addText('Thank You For Your Business', pageWidth - margin, fY, { fontSize: 8, fontStyle: 'bold', color: colors.dark, align: 'right' });

}



// =====================================================

// DELIVERY NOTE — MODERN TEMPLATE

// =====================================================

async function generateDeliveryNoteModernPDF(

  pdf: jsPDF,

  options: GeneratePDFOptions,

  colors: ColorScheme

) {

  const { document, company, client, pdfSettings } = options;

  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;

  const pageWidth = pdf.internal.pageSize.getWidth();

  const pageHeight = pdf.internal.pageSize.getHeight();

  const margin = 18;

  const addText = createTextHelper(pdf, colors.textOnLight);

  const dn = document as DeliveryNote;



  const headerH = 42;

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, headerH, 'F');



  let logoEndX = margin;

  if (settings.showLogo && company.logo) {

    try {

      const logoSizes = { small: 20, medium: 28, large: 36 };

      const dims = await getLogoDimensions(company.logo, logoSizes[settings.logoSize], logoSizes[settings.logoSize]);

      pdf.addImage(dims.dataUrl, dims.format, margin, (headerH - dims.height) / 2, dims.width, dims.height);

      logoEndX = margin + dims.width + 5;

    } catch { }

  }

  addText(company.name.toUpperCase(), logoEndX, headerH / 2 - 2, { fontSize: 11, fontStyle: 'bold', color: colors.textOnDark });

  if (company.website) addText(company.website, logoEndX, headerH / 2 + 5, { fontSize: 7, color: [160, 180, 200] });

  addText('DELIVERY NOTE', pageWidth - margin, headerH / 2 + 4, { fontSize: 20, fontStyle: 'bold', color: [255, 255, 255], align: 'right' });



  pdf.setFillColor(...colors.primary);

  pdf.rect(0, headerH, pageWidth * 0.6, 3, 'F');

  pdf.setFillColor(...colors.dark);

  pdf.rect(pageWidth * 0.6, headerH, pageWidth * 0.4, 3, 'F');



  let yPos = headerH + 14;

  addText('DELIVER TO:', margin, yPos, { fontSize: 8.5, fontStyle: 'bold', color: colors.primary }); yPos += 6;

  // Wrap long client names to prevent overlap with right-column delivery note details
  const clientNameMaxW = pageWidth / 2 - margin - 5;
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.textOnLight);
  const clientNameLines = pdf.splitTextToSize(client.name, clientNameMaxW) as string[];
  clientNameLines.forEach((line, i) => { pdf.text(line, margin, yPos + i * 7); });
  yPos += clientNameLines.length * 7;

  if (client.contactPerson) { addText(client.contactPerson, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5; }

  addText(`Phone: ${client.phone}`, margin, yPos, { fontSize: 8.5, color: colors.gray }); yPos += 5;

  addText(`Address: ${client.address.street}, ${client.address.city}`, margin, yPos, { fontSize: 8.5, color: colors.gray });



  const rightInfoX = pageWidth / 2 + 15;

  let rY = headerH + 14;

  const docRows: [string, string][] = [

    ['Delivery Note #:', document.documentNumber],

    ['Delivery Date:', formatDate(dn.deliveryDate)],

    ...(document.referenceNumber ? [['Reference:', document.referenceNumber] as [string, string]] : []),

    ...(dn.receivedBy ? [['Received By:', dn.receivedBy] as [string, string]] : []),

  ];

  docRows.forEach(([lbl, val]) => {

    addText(lbl, rightInfoX, rY, { fontSize: 8, color: colors.gray });

    addText(val, pageWidth - margin, rY, { fontSize: 8, fontStyle: 'bold', align: 'right' });

    rY += 6;

  });



  yPos = headerH + 70;

  autoTable(pdf, {

    head: [['#', 'Item', 'Description', 'QTY Ordered', 'QTY Shipped']],

    body: document.items.map((item, i) => [

      (i + 1).toString(),

      item.name,

      item.description || '-',

      item.quantity.toString(),

      item.quantity.toString(),

    ]),

    startY: yPos,

    margin: { left: margin, right: margin },

    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },

    bodyStyles: { fontSize: 8.5, textColor: colors.textOnLight, cellPadding: 5 },

    alternateRowStyles: { fillColor: [255, 255, 255] },

    styles: { lineColor: [235, 235, 235], lineWidth: 0.3 },

    columnStyles: {

      0: { cellWidth: 12, halign: 'center' },

      1: { cellWidth: 45, halign: 'left' },

      2: { cellWidth: 'auto', halign: 'left' },

      3: { cellWidth: 26, halign: 'center' },

      4: { cellWidth: 26, halign: 'center' },

    },

  });



  yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  if (yPos > pageHeight - 70) { pdf.addPage(); yPos = margin; }



  if (settings.showTerms && document.notes) {

    addText('Notes:', margin, yPos, { fontSize: 9, fontStyle: 'bold' }); yPos += 6;

    const nl = pdf.splitTextToSize(document.notes, pageWidth - 2 * margin);

    pdf.setFontSize(8); pdf.setTextColor(...colors.gray); pdf.text(nl, margin, yPos); yPos += nl.length * 4.5 + 8;

  }



  // Received By signature block

  const halfW = (pageWidth - 2 * margin - 8) / 2;

  addText('RECEIVED BY', margin, yPos, { fontSize: 9, fontStyle: 'bold', color: colors.primary }); yPos += 15;

  pdf.setDrawColor(...colors.gray); pdf.setLineWidth(0.3);

  pdf.line(margin, yPos, margin + 70, yPos);

  addText('Signature', margin, yPos + 6, { fontSize: 8, color: colors.gray });

  pdf.line(margin + halfW, yPos, margin + halfW + 55, yPos);

  addText('Date', margin + halfW, yPos + 6, { fontSize: 8, color: colors.gray });



  const fY = pageHeight - 16;

  pdf.setFillColor(...colors.primary);

  pdf.rect(0, fY - 7, pageWidth, 0.5, 'F');

  const footItems = [`Tel: ${company.phone}`, `Email: ${company.email}`, ...(company.website ? [`Web: ${company.website}`] : [])];

  const footAreaW = pageWidth * 0.52;

  const segW = footAreaW / footItems.length;

  footItems.forEach((part, idx) => addText(part, margin + segW * idx + segW / 2, fY, { fontSize: 7.5, color: colors.gray, align: 'center' }));

  addText('Thank You For Your Business', pageWidth - margin, fY, { fontSize: 8, fontStyle: 'bold', color: colors.dark, align: 'right' });

}



// =====================================================

// MAIN PDF GENERATION FUNCTION

// =====================================================

export async function generateDocumentPDF(options: GeneratePDFOptions): Promise<Blob> {

  const pdf = new jsPDF('p', 'mm', 'a4');

  const settings = options.pdfSettings || DEFAULT_PDF_SETTINGS;

  const activeColor = getActiveColor(settings);



  const colors = createColorScheme(

    activeColor.primary,

    activeColor.secondary,

    activeColor.accent

  );



  // Generate based on document type + selected template

  const docTemplates = settings.documentTemplates ?? { quotation: 'standard', invoice: 'standard', purchase_order: 'standard', delivery_note: 'standard' };

  switch (options.document.type) {

    case 'quotation':

      if (docTemplates.quotation === 'corporate') await generateQuotationCorporatePDF(pdf, options, colors);

      else if (docTemplates.quotation === 'classic') await generateQuotationClassicPDF(pdf, options, colors);

      else if (docTemplates.quotation === 'modern') await generateQuotationModernPDF(pdf, options, colors);

      else await generateQuotationPDF(pdf, options, colors);

      break;

    case 'invoice':

      if (docTemplates.invoice === 'corporate') await generateInvoiceCorporatePDF(pdf, options, colors);

      else if (docTemplates.invoice === 'classic') await generateInvoiceClassicPDF(pdf, options, colors);

      else if (docTemplates.invoice === 'modern') await generateInvoiceModernPDF(pdf, options, colors);

      else await generateInvoicePDF(pdf, options, colors);

      break;

    case 'purchase_order':

      if (docTemplates.purchase_order === 'corporate') await generatePurchaseOrderCorporatePDF(pdf, options, colors);

      else if (docTemplates.purchase_order === 'classic') await generatePurchaseOrderClassicPDF(pdf, options, colors);

      else if (docTemplates.purchase_order === 'modern') await generatePurchaseOrderModernPDF(pdf, options, colors);

      else await generatePurchaseOrderPDF(pdf, options, colors);

      break;

    case 'delivery_note':

      if (docTemplates.delivery_note === 'corporate') await generateDeliveryNoteCorporatePDF(pdf, options, colors);

      else if (docTemplates.delivery_note === 'classic') await generateDeliveryNoteClassicPDF(pdf, options, colors);

      else if (docTemplates.delivery_note === 'modern') await generateDeliveryNoteModernPDF(pdf, options, colors);

      else await generateDeliveryNotePDF(pdf, options, colors);

      break;

    default:

      await generateQuotationPDF(pdf, options, colors);

  }



  // Add page numbers to all pages

  addPageNumbers(pdf, colors);



  return pdf.output('blob');

}



// =====================================================

// LETTER PDF GENERATION

// =====================================================

// ── Letter PDF: Corporate template ────────────────────────────
async function generateLetterCorporatePDF(
  pdf: jsPDF,
  letter: Letter,
  company: CompanyProfile,
  colors: ColorScheme,
  settings: PDFSettings,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): Promise<void> {
  const addText = createTextHelper(pdf, colors.textOnLight);
  const logoSizes = { small: 20, medium: 25, large: 30 };
  const logoMaxSize = logoSizes[settings.logoSize];

  // Full dark header + accent stripe
  pdf.setFillColor(...colors.dark);
  pdf.rect(0, 0, pageWidth, 38, 'F');
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 36, pageWidth, 3, 'F');
  addText(company.name, margin, 16, { fontSize: 17, fontStyle: 'bold', color: colors.textOnDark });
  const hContact = [company.address.street, company.address.city, company.phone].filter(Boolean).join('  |  ');
  addText(hContact, margin, 27, { fontSize: 7.5, color: colors.textOnDark });
  if (settings.showLogo && company.logo) {
    try {
      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);
      pdf.addImage(dims.dataUrl, dims.format, pageWidth - margin - dims.width, 6, dims.width, dims.height);
    } catch { }
  }

  let yPos = 50;
  addText(formatDate(letter.dateIssued), pageWidth - margin, yPos, { fontSize: 9.5, align: 'right', color: colors.gray });
  yPos += 14;

  // FROM / TO info boxes
  const boxW = (pageWidth - 2 * margin - 6) / 2;
  const boxH = 32;
  const boxY = yPos;
  pdf.setFillColor(...colors.primary);
  pdf.rect(margin, boxY, boxW, 7, 'F');
  addText('FROM', margin + 4, boxY + 5, { fontSize: 7, fontStyle: 'bold', color: colors.textOnDark });
  pdf.setFillColor(248, 248, 248);
  pdf.rect(margin, boxY + 7, boxW, boxH - 7, 'F');
  addText(company.name, margin + 4, boxY + 13, { fontSize: 8.5, fontStyle: 'bold' });
  const fromAddr = [company.address.street, company.address.city].filter(Boolean).join(', ');
  if (fromAddr) addText(fromAddr, margin + 4, boxY + 20, { fontSize: 7.5, color: colors.gray });
  addText(company.email, margin + 4, boxY + 27, { fontSize: 7.5, color: colors.gray });
  const toX = margin + boxW + 6;
  pdf.setFillColor(...colors.dark);
  pdf.rect(toX, boxY, boxW, 7, 'F');
  addText('TO', toX + 4, boxY + 5, { fontSize: 7, fontStyle: 'bold', color: colors.textOnDark });
  pdf.setFillColor(242, 247, 255);
  pdf.rect(toX, boxY + 7, boxW, boxH - 7, 'F');
  addText(letter.recipientName, toX + 4, boxY + 13, { fontSize: 8.5, fontStyle: 'bold' });
  const toAddr = [letter.recipientAddress.street, letter.recipientAddress.city].filter(Boolean).join(', ');
  if (toAddr) addText(toAddr, toX + 4, boxY + 20, { fontSize: 7.5, color: colors.gray });
  if (letter.recipientAddress.country) addText(letter.recipientAddress.country, toX + 4, boxY + 27, { fontSize: 7.5, color: colors.gray });
  yPos = boxY + boxH + 12;

  // Subject with left border accent
  pdf.setFillColor(...colors.primary);
  pdf.rect(margin, yPos, 2.5, 14, 'F');
  addText('SUBJECT', margin + 6, yPos + 4.5, { fontSize: 6.5, fontStyle: 'bold', color: colors.primary });
  addText(letter.subject, margin + 6, yPos + 12, { fontSize: 11, fontStyle: 'bold' });
  yPos += 22;

  addText(letter.salutation + ',', margin, yPos, { fontSize: 10.5 });
  yPos += 10;

  const maxWidth = pageWidth - 2 * margin;
  for (const para of letter.content.split('\n\n')) {
    const lines = pdf.splitTextToSize(para.trim(), maxWidth);
    for (const line of lines) {
      if (yPos > pageHeight - 40) { pdf.addPage(); yPos = margin; }
      addText(line, margin, yPos, { fontSize: 10.5 });
      yPos += 6;
    }
    yPos += 4;
  }

  yPos += 8;
  if (yPos > pageHeight - 50) { pdf.addPage(); yPos = margin; }
  addText(letter.closing + ',', margin, yPos, { fontSize: 10.5 });
  yPos += 18;
  pdf.setDrawColor(...colors.gray);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPos, margin + 50, yPos);
  yPos += 5;
  addText(company.name, margin, yPos, { fontSize: 9.5, fontStyle: 'bold' });

  // Dark footer bar
  pdf.setFillColor(...colors.dark);
  pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  addText(`${company.name}  |  ${company.phone}  |  ${company.email}`, pageWidth / 2, pageHeight - 5, { fontSize: 7, color: colors.textOnDark, align: 'center' });
  addPageNumbers(pdf, colors);
}

// ── Letter PDF: Classic template ───────────────────────────────
async function generateLetterClassicPDF(
  pdf: jsPDF,
  letter: Letter,
  company: CompanyProfile,
  colors: ColorScheme,
  settings: PDFSettings,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): Promise<void> {
  const addText = createTextHelper(pdf, colors.textOnLight);
  const logoSizes = { small: 20, medium: 25, large: 30 };
  const logoMaxSize = logoSizes[settings.logoSize];
  let yPos = margin;

  // Company name / logo right-aligned (no colored bar)
  if (settings.showLogo && company.logo) {
    try {
      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);
      pdf.addImage(dims.dataUrl, dims.format, pageWidth - margin - dims.width, yPos, dims.width, dims.height);
      yPos = yPos + dims.height + 3;
    } catch { yPos += 5; }
  }
  addText(company.name, pageWidth - margin, yPos, { fontSize: 18, fontStyle: 'bold', align: 'right', color: colors.dark });
  yPos += 7;
  const addrLine = [company.address.street, company.address.city, company.address.country].filter(Boolean).join(', ');
  addText(addrLine, pageWidth - margin, yPos, { fontSize: 8, align: 'right', color: colors.gray });
  yPos += 5;
  addText(`${company.phone}  |  ${company.email}`, pageWidth - margin, yPos, { fontSize: 8, align: 'right', color: colors.gray });
  yPos += 10;

  // Single horizontal rule
  pdf.setDrawColor(...colors.dark);
  pdf.setLineWidth(0.8);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  addText(formatDate(letter.dateIssued), pageWidth - margin, yPos, { fontSize: 10, align: 'right' });
  yPos += 12;

  addText(letter.recipientName, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
  yPos += 6;
  if (letter.recipientAddress.street) { addText(letter.recipientAddress.street, margin, yPos, { fontSize: 9, color: colors.gray }); yPos += 5; }
  const cl = [letter.recipientAddress.city, letter.recipientAddress.state, letter.recipientAddress.postalCode].filter(Boolean).join(', ');
  if (cl) { addText(cl, margin, yPos, { fontSize: 9, color: colors.gray }); yPos += 5; }
  if (letter.recipientAddress.country) { addText(letter.recipientAddress.country, margin, yPos, { fontSize: 9, color: colors.gray }); yPos += 5; }
  yPos += 10;

  // Centered italic subject with colored underline
  addText('Re: ' + letter.subject, pageWidth / 2, yPos, { fontSize: 10.5, fontStyle: 'italic', align: 'center' });
  yPos += 3;
  const subjW = Math.min(pdf.getTextWidth('Re: ' + letter.subject) + 12, pageWidth - 2 * margin);
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(0.5);
  pdf.line((pageWidth - subjW) / 2, yPos, (pageWidth + subjW) / 2, yPos);
  yPos += 11;

  addText(letter.salutation + ',', margin, yPos, { fontSize: 10.5 });
  yPos += 10;

  const maxWidth = pageWidth - 2 * margin;
  for (const para of letter.content.split('\n\n')) {
    const lines = pdf.splitTextToSize(para.trim(), maxWidth);
    for (const line of lines) {
      if (yPos > pageHeight - 40) { pdf.addPage(); yPos = margin; }
      addText(line, margin, yPos, { fontSize: 10.5 });
      yPos += 6;
    }
    yPos += 4;
  }

  yPos += 8;
  if (yPos > pageHeight - 50) { pdf.addPage(); yPos = margin; }
  addText(letter.closing + ',', margin, yPos, { fontSize: 10.5 });
  yPos += 20;
  pdf.setDrawColor(...colors.gray);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPos, margin + 60, yPos);
  yPos += 5;
  addText(company.name, margin, yPos, { fontSize: 10, fontStyle: 'bold' });

  // Single-rule footer
  const footerY = pageHeight - 16;
  pdf.setDrawColor(...colors.dark);
  pdf.setLineWidth(0.8);
  pdf.line(margin, footerY, pageWidth - margin, footerY);
  addText(`${company.name}  |  ${company.phone}  |  ${company.email}`, pageWidth / 2, footerY + 9, { fontSize: 7, color: colors.gray, align: 'center' });
  addPageNumbers(pdf, colors);
}

// ── Letter PDF: Modern template ────────────────────────────────
async function generateLetterModernPDF(
  pdf: jsPDF,
  letter: Letter,
  company: CompanyProfile,
  colors: ColorScheme,
  settings: PDFSettings,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): Promise<void> {
  const addText = createTextHelper(pdf, colors.textOnLight);
  const logoSizes = { small: 20, medium: 25, large: 30 };
  const logoMaxSize = logoSizes[settings.logoSize];
  const sideW = 4;

  const drawSidebar = () => {
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, sideW, pageHeight, 'F');
  };
  drawSidebar();

  if (settings.showLogo && company.logo) {
    try {
      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);
      pdf.addImage(dims.dataUrl, dims.format, pageWidth - margin - dims.width, margin, dims.width, dims.height);
    } catch { }
  }

  addText(company.name, margin, margin + 10, { fontSize: 20, fontStyle: 'bold', color: colors.dark });

  // Light grey contact bar
  pdf.setFillColor(245, 245, 245);
  pdf.rect(0, margin + 16, pageWidth, 9, 'F');
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, margin + 16, sideW, 9, 'F');
  const contactLine = [
    company.address.street ? `${company.address.street}, ${company.address.city}` : company.address.city,
    company.phone,
    company.email,
  ].filter(Boolean).join('  |  ');
  addText(contactLine, margin, margin + 22, { fontSize: 7.5, color: colors.gray });

  let yPos = margin + 36;
  addText(formatDate(letter.dateIssued), pageWidth - margin, yPos, { fontSize: 10, align: 'right', color: colors.gray });
  yPos += 12;

  addText(letter.recipientName, margin, yPos, { fontSize: 11, fontStyle: 'bold' });
  yPos += 6;
  const recAddr = [letter.recipientAddress.street, letter.recipientAddress.city, letter.recipientAddress.country].filter(Boolean).join(', ');
  if (recAddr) { addText(recAddr, margin, yPos, { fontSize: 9, color: colors.gray }); yPos += 6; }
  yPos += 8;

  // Subject with colored RE: pill
  pdf.setFillColor(...colors.primary);
  pdf.roundedRect(margin, yPos - 3.5, 13, 6.5, 1.5, 1.5, 'F');
  addText('RE:', margin + 1.5, yPos + 1, { fontSize: 7, fontStyle: 'bold', color: colors.textOnDark });
  addText(letter.subject, margin + 16, yPos + 1, { fontSize: 11, fontStyle: 'bold', color: colors.dark });
  yPos += 14;

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 9;

  addText(letter.salutation + ',', margin, yPos, { fontSize: 10.5 });
  yPos += 10;

  const bodyL = margin + 4;
  const maxWidth = pageWidth - bodyL - margin;
  for (const para of letter.content.split('\n\n')) {
    const lines = pdf.splitTextToSize(para.trim(), maxWidth);
    for (const line of lines) {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        drawSidebar();
        yPos = margin;
      }
      addText(line, bodyL, yPos, { fontSize: 10.5 });
      yPos += 6;
    }
    yPos += 4;
  }

  yPos += 8;
  if (yPos > pageHeight - 50) {
    pdf.addPage();
    drawSidebar();
    yPos = margin;
  }
  addText(letter.closing + ',', margin, yPos, { fontSize: 10.5 });
  yPos += 20;
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPos, margin + 55, yPos);
  yPos += 5;
  addText(company.name, margin, yPos, { fontSize: 10, fontStyle: 'bold' });

  const footerY = pageHeight - 12;
  pdf.setFillColor(...colors.primary);
  pdf.rect(sideW, footerY - 1, pageWidth - sideW, 1.5, 'F');
  addText(`${company.name}  |  ${company.phone}  |  ${company.email}`, pageWidth / 2, footerY + 7, { fontSize: 7, color: colors.gray, align: 'center' });
  addPageNumbers(pdf, colors);
}

export async function generateLetterPDF(

  letter: Letter,

  company: CompanyProfile,

  pdfSettings?: PDFSettings,
): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const settings = pdfSettings || DEFAULT_PDF_SETTINGS;
  const activeColor = getActiveColor(settings);
  const colors = createColorScheme(activeColor.primary, activeColor.secondary, activeColor.accent);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;

  // Dispatch to the selected letter template
  const letterTemplate = settings.documentTemplates?.letter ?? 'standard';
  if (letterTemplate !== 'standard') {
    if (letterTemplate === 'corporate') await generateLetterCorporatePDF(pdf, letter, company, colors, settings, pageWidth, pageHeight, margin);
    else if (letterTemplate === 'classic') await generateLetterClassicPDF(pdf, letter, company, colors, settings, pageWidth, pageHeight, margin);
    else if (letterTemplate === 'modern') await generateLetterModernPDF(pdf, letter, company, colors, settings, pageWidth, pageHeight, margin);
    return pdf.output('blob');
  }

  let yPos = margin;



  const addText = createTextHelper(pdf, colors.textOnLight);



  // Header with company info and logo

  // Colored header bar

  pdf.setFillColor(...colors.dark);

  pdf.rect(0, 0, pageWidth, 35, 'F');



  // Company name in header

  addText(company.name, margin, 15, { fontSize: 16, fontStyle: 'bold', color: colors.textOnDark });



  // Logo in top right

  const logoSizes = { small: 20, medium: 25, large: 30 };

  const logoMaxSize = logoSizes[settings.logoSize];

  if (settings.showLogo && company.logo) {

    try {

      const dims = await getLogoDimensions(company.logo, logoMaxSize, logoMaxSize);

      pdf.addImage(dims.dataUrl, dims.format, pageWidth - margin - dims.width, 7, dims.width, dims.height);

    } catch { }

  }



  // Company contact info in header

  const contactInfo = `${company.address.street}, ${company.address.city} | ${company.phone} | ${company.email}`;

  addText(contactInfo, margin, 25, { fontSize: 8, color: colors.textOnDark });



  yPos = 50;



  // Date

  addText(formatDate(letter.dateIssued), pageWidth - margin, yPos, { fontSize: 10, align: 'right' });

  yPos += 15;



  // Recipient address

  addText(letter.recipientName, margin, yPos, { fontSize: 11, fontStyle: 'bold' });

  yPos += 6;



  if (letter.recipientAddress.street) {

    addText(letter.recipientAddress.street, margin, yPos, { fontSize: 10 });

    yPos += 5;

  }



  const cityLine = [

    letter.recipientAddress.city,

    letter.recipientAddress.state,

    letter.recipientAddress.postalCode

  ].filter(Boolean).join(', ');



  if (cityLine) {

    addText(cityLine, margin, yPos, { fontSize: 10 });

    yPos += 5;

  }



  if (letter.recipientAddress.country) {

    addText(letter.recipientAddress.country, margin, yPos, { fontSize: 10 });

    yPos += 5;

  }



  yPos += 10;



  // Subject line

  addText('Re: ' + letter.subject, margin, yPos, { fontSize: 11, fontStyle: 'bold' });

  yPos += 10;



  // Salutation

  addText(letter.salutation + ',', margin, yPos, { fontSize: 11 });

  yPos += 10;



  // Letter content - handle line breaks and paragraphs

  const paragraphs = letter.content.split('\n\n');

  const maxWidth = pageWidth - (2 * margin);



  for (const paragraph of paragraphs) {

    const lines = pdf.splitTextToSize(paragraph.trim(), maxWidth);



    for (const line of lines) {

      // Check if we need a new page

      if (yPos > pageHeight - 40) {

        pdf.addPage();

        yPos = margin;

      }



      addText(line, margin, yPos, { fontSize: 11 });

      yPos += 6;

    }



    yPos += 4; // Extra space between paragraphs

  }



  yPos += 10;



  // Closing

  if (yPos > pageHeight - 50) {

    pdf.addPage();

    yPos = margin;

  }



  addText(letter.closing + ',', margin, yPos, { fontSize: 11 });

  yPos += 20;



  // Signature line

  pdf.setDrawColor(...colors.gray);

  pdf.setLineWidth(0.3);

  pdf.line(margin, yPos, margin + 60, yPos);

  yPos += 5;



  addText(company.name, margin, yPos, { fontSize: 10, fontStyle: 'bold' });



  // Footer with colored bar

  const footerY = pageHeight - 15;

  pdf.setFillColor(...colors.primary);

  pdf.rect(0, footerY - 5, pageWidth, 2, 'F');



  const footerText = `${company.name} | ${company.phone} | ${company.email} | ${company.website || ''}`;

  addText(footerText, pageWidth / 2, footerY, { fontSize: 7, color: colors.gray, align: 'center' });



  // Add page numbers

  addPageNumbers(pdf, colors);



  return pdf.output('blob');

}



export function downloadPDF(blob: Blob, filename: string) {

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);

}
