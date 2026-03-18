import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { R2StorageService } from './r2-storage.service';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;

  // Company info (platform)
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;

  // Customer info
  customerName: string;
  customerEmail: string;
  businessName: string;

  // Items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  // Totals
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;

  // Payment info
  paymentMethod?: string;
  referenceId: string;
  billingPeriod?: string;

  // Footer
  notes?: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly r2Storage: R2StorageService) {}

  /**
   * Generate a PDF invoice and upload it to R2 storage.
   * Returns the public URL of the stored PDF.
   */
  async generateAndUpload(data: InvoiceData): Promise<string> {
    const buffer = await this.generatePdf(data);
    const filename = `invoice-${data.invoiceNumber}.pdf`;

    const result = await this.r2Storage.upload(
      buffer,
      'invoices',
      filename,
      'application/pdf',
    );

    this.logger.log(`Invoice generated: ${result.url}`);
    return result.url;
  }

  /**
   * Generate an invoice PDF and return the buffer.
   */
  async generatePdf(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.buildInvoice(doc, data);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private buildInvoice(doc: PDFKit.PDFDocument, data: InvoiceData): void {
    const pageWidth = doc.page.width - 100; // margins

    // ── Header ──────────────────────────────────────────
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(data.companyName, 50, 50)
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666');

    if (data.companyAddress) {
      doc.text(data.companyAddress, 50, 80);
    }
    if (data.companyEmail) {
      doc.text(data.companyEmail);
    }

    // Invoice title — right aligned
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('INVOICE', 350, 50, { align: 'right' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Invoice #: ${data.invoiceNumber}`, 350, 78, { align: 'right' })
      .text(`Date: ${data.date}`, 350, 93, { align: 'right' });

    if (data.dueDate) {
      doc.text(`Due Date: ${data.dueDate}`, 350, 108, { align: 'right' });
    }

    // ── Divider ─────────────────────────────────────────
    doc
      .moveTo(50, 130)
      .lineTo(50 + pageWidth, 130)
      .strokeColor('#cccccc')
      .stroke();

    // ── Bill To ─────────────────────────────────────────
    let y = 150;
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Bill To:', 50, y);

    y += 18;
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#444444')
      .text(data.customerName, 50, y)
      .text(data.customerEmail, 50, y + 15)
      .text(data.businessName, 50, y + 30);

    if (data.billingPeriod) {
      doc.text(`Billing Period: ${data.billingPeriod}`, 50, y + 45);
    }

    // ── Items Table ─────────────────────────────────────
    y = 260;
    const tableTop = y;
    const col1 = 50;
    const col2 = 310;
    const col3 = 380;
    const col4 = 460;

    // Table header
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#ffffff');

    // Header background
    doc
      .rect(col1, tableTop - 5, pageWidth, 22)
      .fill('#4a90d9');

    doc
      .fillColor('#ffffff')
      .text('Description', col1 + 10, tableTop, { width: 250 })
      .text('Qty', col2, tableTop, { width: 60, align: 'center' })
      .text('Unit Price', col3, tableTop, { width: 70, align: 'right' })
      .text('Amount', col4, tableTop, { width: 80, align: 'right' });

    // Table rows
    y = tableTop + 25;
    doc.font('Helvetica').fillColor('#333333');

    for (const item of data.items) {
      // Alternate row background
      const rowIdx = data.items.indexOf(item);
      if (rowIdx % 2 === 0) {
        doc
          .rect(col1, y - 5, pageWidth, 22)
          .fill('#f8f9fa');
        doc.fillColor('#333333');
      }

      doc
        .fontSize(10)
        .text(item.description, col1 + 10, y, { width: 250 })
        .text(String(item.quantity), col2, y, { width: 60, align: 'center' })
        .text(this.formatCurrency(item.unitPrice, data.currency), col3, y, {
          width: 70,
          align: 'right',
        })
        .text(this.formatCurrency(item.amount, data.currency), col4, y, {
          width: 80,
          align: 'right',
        });

      y += 25;
    }

    // ── Totals ──────────────────────────────────────────
    y += 10;
    doc
      .moveTo(col3 - 20, y)
      .lineTo(col4 + 80, y)
      .strokeColor('#cccccc')
      .stroke();

    y += 10;
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Subtotal:', col3 - 20, y)
      .text(this.formatCurrency(data.subtotal, data.currency), col4, y, {
        width: 80,
        align: 'right',
      });

    if (data.tax !== undefined && data.tax > 0) {
      y += 20;
      doc
        .text('Tax:', col3 - 20, y)
        .text(this.formatCurrency(data.tax, data.currency), col4, y, {
          width: 80,
          align: 'right',
        });
    }

    y += 25;
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Total:', col3 - 20, y)
      .text(this.formatCurrency(data.total, data.currency), col4, y, {
        width: 80,
        align: 'right',
      });

    // ── Payment Info ────────────────────────────────────
    y += 45;
    doc
      .moveTo(50, y)
      .lineTo(50 + pageWidth, y)
      .strokeColor('#cccccc')
      .stroke();

    y += 15;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('Payment Information', 50, y);

    y += 18;
    doc.font('Helvetica').fontSize(9).fillColor('#666666');

    doc.text(`Reference: ${data.referenceId}`, 50, y);
    if (data.paymentMethod) {
      doc.text(`Payment Method: ${data.paymentMethod}`, 50, y + 15);
    }
    doc.text('Status: Paid', 50, y + 30);

    // ── Notes / Footer ──────────────────────────────────
    if (data.notes) {
      y += 65;
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#888888')
        .text(data.notes, 50, y, { width: pageWidth });
    }

    // Footer line
    const footerY = doc.page.height - 60;
    doc
      .moveTo(50, footerY)
      .lineTo(50 + pageWidth, footerY)
      .strokeColor('#cccccc')
      .stroke();

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        'This is a computer-generated invoice. No signature required.',
        50,
        footerY + 10,
        { align: 'center', width: pageWidth },
      );

    doc.text(
      `${data.companyName} — Thank you for your business!`,
      50,
      footerY + 25,
      { align: 'center', width: pageWidth },
    );
  }

  private formatCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      KES: 'KSh',
      GHS: 'GH₵',
      ZAR: 'R',
      TZS: 'TSh',
    };
    const symbol = symbols[currency.toUpperCase()] || currency.toUpperCase() + ' ';
    return `${symbol}${amount.toFixed(2)}`;
  }
}
