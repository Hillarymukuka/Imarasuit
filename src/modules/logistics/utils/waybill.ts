// Waybill & receipt generation utilities for logistics module
// Generates printable HTML documents in new browser windows

import QRCode from 'qrcode';
import type { Shipment } from '../types';

/**
 * Generates a QR code data URL for the given text.
 */
async function generateQRDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 150,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return '';
  }
}

/**
 * Opens a printable waybill in a new window for the given shipment.
 * Uses the client/company name as the heading and generates a real QR code.
 */
export async function printWaybill(shipment: Shipment, companyName?: string) {
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (!win) {
    alert('Please allow popups to print waybills');
    return;
  }

  // Show loading while QR generates
  win.document.write('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;">Generating waybill...</body></html>');

  const displayName = companyName || 'Courier Service';
  const qrDataURL = await generateQRDataURL(shipment.trackingCode);
  const weightStr = shipment.weightKg ? `${shipment.weightKg} kg` : 'N/A';
  const amountStr = shipment.amount != null && shipment.amount > 0 ? `K ${shipment.amount.toFixed(2)}` : 'N/A';
  const dateStr = new Date(shipment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const nowStr = new Date().toLocaleString();

  const containerSection = (shipment.containerCode || shipment.containerName) ? `
    <div class="section">
      <div class="section-header">CONTAINER</div>
      <div class="field-row">
        <span class="field-label">Container Code:</span>
        <span class="field-value">${shipment.containerCode || 'N/A'}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Container Name:</span>
        <span class="field-value">${shipment.containerName || 'N/A'}</span>
      </div>
    </div>
  ` : '';

  const qrHtml = qrDataURL
    ? `<img src="${qrDataURL}" alt="QR ${shipment.trackingCode}" style="width:100%;height:100%;object-fit:contain;" />`
    : `<span>QR CODE<br/>${shipment.trackingCode}</span>`;

  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Waybill - ${shipment.trackingCode}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 14mm 10mm 14mm;
      position: relative;
    }
    /* Title */
    .title {
      font-size: 28pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 6px;
    }
    /* Company info */
    .company-info {
      font-size: 10pt;
      color: #333;
      line-height: 1.5;
      margin-bottom: 10px;
    }
    /* Tracking code line */
    .tracking-line {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin: 12px 0 6px 0;
    }
    .tracking-label {
      font-size: 14pt;
      font-weight: bold;
      color: #000;
    }
    .tracking-value {
      font-size: 14pt;
      font-weight: bold;
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      letter-spacing: 1px;
    }
    /* QR code area */
    .qr-area {
      position: absolute;
      top: 55mm;
      right: 16mm;
      width: 38mm;
      height: 38mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-area span {
      font-size: 8pt;
      color: #999;
      text-align: center;
    }
    /* Separator */
    .sep {
      border: none;
      border-top: 1px solid #ccc;
      margin: 10px 0;
    }
    .sep-thick {
      border: none;
      border-top: 2px solid #000;
      margin: 10px 0;
    }
    /* Section */
    .section {
      margin-bottom: 10px;
    }
    .section-header {
      font-size: 12pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 1px solid #ddd;
    }
    .field-row {
      display: flex;
      font-size: 10pt;
      line-height: 1.7;
    }
    .field-label {
      font-weight: bold;
      color: #333;
      width: 120px;
      flex-shrink: 0;
    }
    .field-value {
      color: #000;
    }
    /* Footer */
    .footer {
      position: absolute;
      bottom: 6mm;
      left: 14mm;
      right: 14mm;
      font-size: 8pt;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 4px;
    }
    .footer-line {
      margin-bottom: 2px;
    }
    /* Print */
    @media print {
      body { background: #fff; }
      .page { padding: 12mm; width: 100%; min-height: auto; }
      .no-print { display: none !important; }
      .qr-area { top: 50mm; right: 14mm; }
    }
    @media screen {
      body { background: #e5e7eb; padding: 20px 0; }
      .page { box-shadow: 0 2px 16px rgba(0,0,0,0.12); border-radius: 2px; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:10px;background:#fff;border-bottom:1px solid #ddd;position:sticky;top:0;z-index:10;">
    <button onclick="window.print()" style="padding:8px 28px;font-size:13px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-right:8px;font-weight:600;">Print Waybill</button>
    <button onclick="window.close()" style="padding:8px 28px;font-size:13px;background:#6b7280;color:#fff;border:none;border-radius:4px;cursor:pointer;">Close</button>
  </div>

  <div class="page">
    <div class="title">WAYBILL</div>
    <div class="company-info">
      ${displayName}<br/>
      Courier &amp; Logistics Services
    </div>

    <hr class="sep-thick" />

    <div class="tracking-line">
      <span class="tracking-label">Tracking Code:</span>
      <span class="tracking-value">${shipment.trackingCode}</span>
    </div>

    <hr class="sep" />

    <!-- QR Code -->
    <div class="qr-area">
      ${qrHtml}
    </div>

    <!-- FROM -->
    <div class="section">
      <div class="section-header">FROM</div>
      <div class="field-row">
        <span class="field-label">Name:</span>
        <span class="field-value">${shipment.senderName}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Phone:</span>
        <span class="field-value">${shipment.senderPhone || 'N/A'}</span>
      </div>
      ${shipment.senderEmail ? `<div class="field-row"><span class="field-label">Email:</span><span class="field-value">${shipment.senderEmail}</span></div>` : ''}
      <div class="field-row">
        <span class="field-label">Location:</span>
        <span class="field-value">${shipment.origin}</span>
      </div>
    </div>

    <!-- TO -->
    <div class="section">
      <div class="section-header">TO</div>
      <div class="field-row">
        <span class="field-label">Name:</span>
        <span class="field-value">${shipment.receiverName}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Phone:</span>
        <span class="field-value">${shipment.receiverPhone || 'N/A'}</span>
      </div>
      ${shipment.receiverEmail ? `<div class="field-row"><span class="field-label">Email:</span><span class="field-value">${shipment.receiverEmail}</span></div>` : ''}
      <div class="field-row">
        <span class="field-label">Location:</span>
        <span class="field-value">${shipment.destination}</span>
      </div>
    </div>

    <!-- PACKAGE DETAILS -->
    <div class="section">
      <div class="section-header">PACKAGE DETAILS</div>
      ${shipment.description ? `<div class="field-row"><span class="field-label">Description:</span><span class="field-value">${shipment.description}</span></div>` : ''}
      <div class="field-row">
        <span class="field-label">Weight:</span>
        <span class="field-value">${weightStr}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Amount:</span>
        <span class="field-value">${amountStr}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Date:</span>
        <span class="field-value">${dateStr}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Status:</span>
        <span class="field-value" style="text-transform:capitalize;">${shipment.status.replace('_', ' ')}</span>
      </div>
    </div>

    ${containerSection}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-line">Generated on: ${nowStr}</div>
      <div class="footer-line">This document is a computer-generated waybill. No signature is required unless otherwise specified.</div>
    </div>
  </div>
</body>
</html>`);
  win.document.close();
}

/**
 * Opens a printable delivery receipt in a new window.
 */
export function printDeliveryReceipt(shipment: Shipment, companyName = 'Courier Service') {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('Please allow popups to print receipts');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Delivery Receipt - ${shipment.trackingCode}</title>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; padding: 20px; max-width: 350px; margin: 0 auto; color: #000; }
    h1 { font-size: 18px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
    h2 { font-size: 14px; text-align: center; color: #666; margin-top: 4px; }
    .field { margin: 8px 0; font-size: 13px; }
    .label { font-weight: bold; color: #333; }
    .divider { border-top: 1px dashed #999; margin: 12px 0; }
    .center { text-align: center; }
    .sig-line { margin-top: 40px; border-top: 1px solid #000; width: 200px; margin-left: auto; margin-right: auto; }
    .tracking { text-align: center; font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; margin: 8px 0; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>DELIVERY RECEIPT</h1>
  <h2>${companyName}</h2>
  <div class="tracking">${shipment.trackingCode}</div>
  <div class="divider"></div>
  <div class="field"><span class="label">From:</span> ${shipment.senderName}</div>
  <div class="field"><span class="label">To:</span> ${shipment.receiverName}</div>
  <div class="field"><span class="label">Route:</span> ${shipment.origin} → ${shipment.destination}</div>
  ${shipment.description ? `<div class="field"><span class="label">Contents:</span> ${shipment.description}</div>` : ''}
  ${shipment.weightKg ? `<div class="field"><span class="label">Weight:</span> ${shipment.weightKg} kg</div>` : ''}
  ${shipment.amount != null && shipment.amount > 0 ? `<div class="field"><span class="label">Amount:</span> K ${shipment.amount.toFixed(2)}</div>` : ''}
  <div class="divider"></div>
  <div class="field"><span class="label">Received by:</span> ${shipment.recipientName || 'N/A'}</div>
  ${shipment.recipientId ? `<div class="field"><span class="label">ID/NRC:</span> ${shipment.recipientId}</div>` : ''}
  <div class="field"><span class="label">Delivered:</span> ${shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleString() : new Date().toLocaleString()}</div>
  <div class="divider"></div>
  <p class="center" style="font-size: 12px; color: #666;">Signature:</p>
  <div class="sig-line"></div>
  <br/>
  <div class="center no-print">
    <button onclick="window.print()" style="padding:8px 24px;cursor:pointer;background:#000;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:600;">Print</button>
    <button onclick="window.close()" style="padding:8px 24px;cursor:pointer;background:#6b7280;color:#fff;border:none;border-radius:4px;font-size:13px;margin-left:8px;">Close</button>
  </div>
  <div class="center" style="margin-top:16px;font-size:9px;color:#999;">Generated: ${new Date().toLocaleString()} | ${companyName}</div>
</body>
</html>`);
  win.document.close();
}
