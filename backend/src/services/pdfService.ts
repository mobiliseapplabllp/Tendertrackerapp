// @ts-ignore - pdfkit lacks type declarations
import PDFDocument from 'pdfkit';
import { getCompanyName } from '../utils/settings';
import logger from '../utils/logger';

interface ProposalPDFData {
  proposal: any;
  lineItems: any[];
  companyName?: string;
}

export async function generateProposalPDF(data: ProposalPDFData): Promise<Buffer> {
  const companyName = data.companyName || await getCompanyName();

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: data.proposal.title || 'Proposal',
          Author: companyName,
          Subject: 'Commercial Proposal',
        }
      });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const p = data.proposal;
      const items = data.lineItems || [];
      const topLevel = items.filter((i: any) => !i.parent_line_item_id);
      const pageWidth = doc.page.width - 100; // margins

      // ============ HEADER ============
      doc.rect(50, 50, pageWidth, 60).fill('#4f46e5');
      doc.fontSize(20).fillColor('#ffffff').font('Helvetica-Bold')
        .text(companyName, 60, 65, { width: pageWidth - 150 });
      doc.fontSize(10).fillColor('#c7d2fe')
        .text('Commercial Proposal', 60, 90);

      // Grand total badge
      const totalStr = `₹${Number(p.grand_total || 0).toLocaleString('en-IN')}`;
      doc.fontSize(8).fillColor('#c7d2fe').text('PROPOSAL VALUE', pageWidth - 80, 62, { width: 70, align: 'right' });
      doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold').text(totalStr, pageWidth - 80, 76, { width: 70, align: 'right' });

      let y = 130;

      // ============ PROPOSAL META ============
      doc.rect(50, y, pageWidth, 50).fill('#f9fafb').stroke('#e5e7eb');
      doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
        .text('PROPOSAL', 60, y + 8)
        .text('REFERENCE', 60 + pageWidth / 3, y + 8)
        .text('VALID UNTIL', 60 + 2 * pageWidth / 3, y + 8);

      const validUntil = p.valid_until ? new Date(p.valid_until).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
      doc.fontSize(10).fillColor('#1f2937').font('Helvetica-Bold')
        .text(p.title || 'Untitled', 60, y + 22, { width: pageWidth / 3 - 20 })
        .text(p.tender_number || 'N/A', 60 + pageWidth / 3, y + 22)
        .text(validUntil, 60 + 2 * pageWidth / 3, y + 22);
      y += 70;

      // ============ CLIENT & SUBMITTER ============
      const halfW = (pageWidth - 10) / 2;
      // Client
      doc.rect(50, y, halfW, 55).fill('#f0fdf4').stroke('#bbf7d0');
      doc.fontSize(8).fillColor('#166534').font('Helvetica-Bold').text('CLIENT', 60, y + 8);
      doc.fontSize(10).fillColor('#1f2937').font('Helvetica')
        .text(p.client || p.company_name || 'N/A', 60, y + 22, { width: halfW - 20 });
      const addr = [p.company_address, p.city, p.state, p.country].filter(Boolean).join(', ');
      if (addr) doc.fontSize(8).fillColor('#6b7280').text(addr, 60, y + 36, { width: halfW - 20 });

      // Submitter
      doc.rect(60 + halfW, y, halfW, 55).fill('#eff6ff').stroke('#bfdbfe');
      doc.fontSize(8).fillColor('#1e40af').font('Helvetica-Bold').text('SUBMITTED BY', 70 + halfW, y + 8);
      doc.fontSize(10).fillColor('#1f2937').font('Helvetica')
        .text(p.created_by_name || 'N/A', 70 + halfW, y + 22);
      doc.fontSize(8).fillColor('#6b7280').text(companyName, 70 + halfW, y + 36);
      y += 75;

      // ============ SECTIONS ============
      const sections = [
        { key: 'cover_letter', label: 'Cover Letter' },
        { key: 'executive_summary', label: 'Executive Summary' },
        { key: 'scope_of_work', label: 'Scope of Work' },
      ];

      for (const sec of sections) {
        const text = p[sec.key];
        if (!text) continue;

        if (y > 680) { doc.addPage(); y = 50; }
        doc.fontSize(12).fillColor('#4f46e5').font('Helvetica-Bold').text(sec.label, 50, y);
        y += 18;
        doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#e5e7eb').stroke();
        y += 8;
        doc.fontSize(9).fillColor('#374151').font('Helvetica').text(text, 50, y, { width: pageWidth, lineGap: 3 });
        y = doc.y + 20;
      }

      // ============ LINE ITEMS TABLE ============
      if (topLevel.length > 0) {
        if (y > 600) { doc.addPage(); y = 50; }
        doc.fontSize(12).fillColor('#4f46e5').font('Helvetica-Bold').text('Pricing Summary', 50, y);
        y += 20;

        // Table header
        const colX = [50, 50 + pageWidth * 0.45, 50 + pageWidth * 0.58, 50 + pageWidth * 0.72, 50 + pageWidth * 0.86];
        const colW = [pageWidth * 0.45, pageWidth * 0.13, pageWidth * 0.14, pageWidth * 0.14, pageWidth * 0.14];
        doc.rect(50, y, pageWidth, 20).fill('#f3f4f6');
        doc.fontSize(8).fillColor('#374151').font('Helvetica-Bold');
        doc.text('Item', colX[0] + 4, y + 6, { width: colW[0] });
        doc.text('Qty', colX[1] + 4, y + 6, { width: colW[1], align: 'center' });
        doc.text('Unit Price', colX[2] + 4, y + 6, { width: colW[2], align: 'right' });
        doc.text('Tax', colX[3] + 4, y + 6, { width: colW[3], align: 'right' });
        doc.text('Total', colX[4] + 4, y + 6, { width: colW[4], align: 'right' });
        y += 22;

        // Table rows
        for (let i = 0; i < topLevel.length; i++) {
          const item = topLevel[i];
          if (y > 720) { doc.addPage(); y = 50; }
          const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
          doc.rect(50, y, pageWidth, 18).fill(bg);
          doc.fontSize(8).fillColor('#1f2937').font('Helvetica');
          const nameStr = item.item_name + (item.item_type === 'Bundle' ? ' [Bundle]' : '');
          doc.text(nameStr, colX[0] + 4, y + 5, { width: colW[0] });
          doc.text(String(item.quantity), colX[1] + 4, y + 5, { width: colW[1], align: 'center' });
          doc.text(`₹${Number(item.unit_price).toLocaleString('en-IN')}`, colX[2] + 4, y + 5, { width: colW[2], align: 'right' });
          doc.text(`${item.tax_rate || 0}%`, colX[3] + 4, y + 5, { width: colW[3], align: 'right' });
          doc.text(`₹${Number(item.line_total).toLocaleString('en-IN')}`, colX[4] + 4, y + 5, { width: colW[4], align: 'right' });
          y += 18;
        }

        // Totals
        y += 2;
        doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        y += 6;
        doc.fontSize(9).fillColor('#374151').font('Helvetica');
        doc.text('Subtotal', 50, y, { width: pageWidth * 0.86, align: 'right' });
        doc.font('Helvetica-Bold').text(`₹${Number(p.subtotal || 0).toLocaleString('en-IN')}`, colX[4] + 4, y, { width: colW[4], align: 'right' });
        y += 16;
        doc.font('Helvetica').fillColor('#6b7280').text('Tax (GST)', 50, y, { width: pageWidth * 0.86, align: 'right' });
        doc.text(`₹${Number(p.total_tax || 0).toLocaleString('en-IN')}`, colX[4] + 4, y, { width: colW[4], align: 'right' });
        y += 16;
        doc.rect(50, y - 2, pageWidth, 22).fill('#eef2ff');
        doc.fontSize(11).fillColor('#4338ca').font('Helvetica-Bold');
        doc.text('Grand Total', 50, y + 3, { width: pageWidth * 0.86, align: 'right' });
        doc.text(`₹${Number(p.grand_total || 0).toLocaleString('en-IN')}`, colX[4] + 4, y + 3, { width: colW[4], align: 'right' });
        y += 30;
      }

      // ============ REMAINING SECTIONS ============
      const remainingSections = [
        { key: 'terms_conditions', label: 'Terms & Conditions' },
        { key: 'payment_terms', label: 'Payment Terms' },
        { key: 'warranty_terms', label: 'Warranty & Support' },
      ];

      for (const sec of remainingSections) {
        const text = p[sec.key];
        if (!text) continue;
        if (y > 680) { doc.addPage(); y = 50; }
        doc.fontSize(12).fillColor('#4f46e5').font('Helvetica-Bold').text(sec.label, 50, y);
        y += 18;
        doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#e5e7eb').stroke();
        y += 8;
        doc.fontSize(9).fillColor('#374151').font('Helvetica').text(text, 50, y, { width: pageWidth, lineGap: 3 });
        y = doc.y + 20;
      }

      // ============ FOOTER ============
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor('#9ca3af').font('Helvetica')
          .text(
            `© ${new Date().getFullYear()} ${companyName}  |  Page ${i + 1} of ${pageCount}  |  ${p.title || ''}`,
            50, doc.page.height - 40,
            { width: pageWidth, align: 'center' }
          );
      }

      doc.end();
    } catch (error: any) {
      logger.error({ message: 'Error generating proposal PDF', error: error.message });
      reject(error);
    }
  });
}
