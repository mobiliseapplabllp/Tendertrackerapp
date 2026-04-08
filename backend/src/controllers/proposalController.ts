import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { logger } from '../utils/logger';

// ==================== Templates ====================

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { productLineId } = req.query;
    let query = 'SELECT * FROM proposal_templates WHERE is_active = TRUE';
    const params: any[] = [];
    if (productLineId) {
      query += ' AND (product_line_id = ? OR product_line_id IS NULL)';
      params.push(productLineId);
    }
    query += ' ORDER BY name';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching templates', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
};

// ==================== Proposals CRUD ====================

export const getByLead = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const [rows] = await db.query(
      `SELECT p.*, u.full_name as created_by_name, a.full_name as approved_by_name,
       pt.name as template_name
       FROM proposals p
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN users a ON p.approved_by = a.id
       LEFT JOIN proposal_templates pt ON p.template_id = pt.id
       WHERE p.tender_id = ? AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`, [leadId]
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching proposals', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
};

export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT p.*, u.full_name as created_by_name, a.full_name as approved_by_name,
       pt.name as template_name
       FROM proposals p
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN users a ON p.approved_by = a.id
       LEFT JOIN proposal_templates pt ON p.template_id = pt.id
       WHERE p.id = ? AND p.deleted_at IS NULL`, [id]
    );
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, error: 'Proposal not found' });
    const proposal = (rows as any[])[0];

    // Fetch line items
    const [items] = await db.query(
      `SELECT li.*, p.name as product_name
       FROM proposal_line_items li
       LEFT JOIN products p ON li.product_id = p.id
       WHERE li.proposal_id = ?
       ORDER BY li.display_order, li.id`, [id]
    );
    proposal.lineItems = items;

    res.json({ success: true, data: proposal });
  } catch (error: any) {
    logger.error({ message: 'Error fetching proposal', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch proposal' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { tenderId, templateId, title, description, proposalType, coverLetter, executiveSummary,
      scopeOfWork, termsConditions, paymentTerms, warrantyTerms, validityPeriodDays, currency } = req.body;

    if (!title || !tenderId) {
      return res.status(400).json({ success: false, error: 'Title and lead ID are required' });
    }

    // If template selected, load defaults
    let templateDefaults: any = {};
    if (templateId) {
      const [tpl] = await db.query('SELECT * FROM proposal_templates WHERE id = ?', [templateId]);
      if ((tpl as any[]).length > 0) {
        const t = (tpl as any[])[0];
        templateDefaults = {
          cover_letter: t.default_cover_letter,
          executive_summary: t.default_executive_summary,
          scope_of_work: t.default_scope,
          terms_conditions: t.default_terms_conditions,
          payment_terms: t.default_payment_terms,
          warranty_terms: t.default_warranty,
          validity_period_days: t.validity_days,
        };
      }
    }

    const validDays = validityPeriodDays || templateDefaults.validity_period_days || 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const [result] = await db.query(
      `INSERT INTO proposals (tender_id, template_id, title, description, proposal_type, status,
        cover_letter, executive_summary, scope_of_work, terms_conditions, payment_terms, warranty_terms,
        validity_period_days, valid_until, currency, created_by)
       VALUES (?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenderId, templateId || null, title, description || null, proposalType || 'Software',
        coverLetter || templateDefaults.cover_letter || null,
        executiveSummary || templateDefaults.executive_summary || null,
        scopeOfWork || templateDefaults.scope_of_work || null,
        termsConditions || templateDefaults.terms_conditions || null,
        paymentTerms || templateDefaults.payment_terms || null,
        warrantyTerms || templateDefaults.warranty_terms || null,
        validDays, validUntil.toISOString().split('T')[0],
        currency || 'INR', req.user!.userId]
    );

    const proposalId = (result as any).insertId;

    // Log activity
    await db.query(
      `INSERT INTO tender_activities (tender_id, user_id, activity_type, description) VALUES (?, ?, 'Created', ?)`,
      [tenderId, req.user!.userId, `Proposal created: ${title}`]
    );

    logger.info({ message: 'Proposal created', proposalId, tenderId, createdBy: req.user!.userId });
    const [rows] = await db.query('SELECT * FROM proposals WHERE id = ?', [proposalId]);
    res.status(201).json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error creating proposal', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create proposal' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allowedFields: Record<string, string> = {
      title: 'title', description: 'description', proposalType: 'proposal_type',
      coverLetter: 'cover_letter', executiveSummary: 'executive_summary',
      scopeOfWork: 'scope_of_work', termsConditions: 'terms_conditions',
      paymentTerms: 'payment_terms', warrantyTerms: 'warranty_terms',
      validityPeriodDays: 'validity_period_days', currency: 'currency',
    };
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, col] of Object.entries(allowedFields)) {
      if (req.body[key] !== undefined) { fields.push(`${col} = ?`); params.push(req.body[key]); }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    params.push(id);
    await db.query(`UPDATE proposals SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
    const [rows] = await db.query('SELECT * FROM proposals WHERE id = ?', [id]);
    res.json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error updating proposal', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update proposal' });
  }
};

export const deleteProposal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE proposals SET deleted_at = NOW() WHERE id = ?', [id]);
    res.json({ success: true, message: 'Proposal deleted' });
  } catch (error: any) {
    logger.error({ message: 'Error deleting proposal', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete proposal' });
  }
};

// ==================== Workflow ====================

export const submitForApproval = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM proposals WHERE id = ? AND deleted_at IS NULL', [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, error: 'Proposal not found' });
    const proposal = (rows as any[])[0];
    if (proposal.status !== 'Draft' && proposal.status !== 'Rejected') {
      return res.status(400).json({ success: false, error: 'Only Draft or Rejected proposals can be submitted for approval' });
    }
    await db.query('UPDATE proposals SET status = ? WHERE id = ?', ['Pending Approval', id]);
    await db.query(
      `INSERT INTO tender_activities (tender_id, user_id, activity_type, description) VALUES (?, ?, 'Updated', ?)`,
      [proposal.tender_id, req.user!.userId, `Proposal "${proposal.title}" submitted for approval`]
    );
    res.json({ success: true, message: 'Proposal submitted for approval' });
  } catch (error: any) {
    logger.error({ message: 'Error submitting proposal', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to submit proposal' });
  }
};

export const approve = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role?.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ success: false, error: 'Only Managers and Admins can approve proposals' });
    }
    const [rows] = await db.query('SELECT * FROM proposals WHERE id = ? AND deleted_at IS NULL', [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, error: 'Proposal not found' });
    const proposal = (rows as any[])[0];
    if (proposal.status !== 'Pending Approval') {
      return res.status(400).json({ success: false, error: 'Only proposals pending approval can be approved' });
    }
    await db.query('UPDATE proposals SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?', ['Approved', req.user!.userId, id]);
    await db.query(
      `INSERT INTO tender_activities (tender_id, user_id, activity_type, description) VALUES (?, ?, 'Updated', ?)`,
      [proposal.tender_id, req.user!.userId, `Proposal "${proposal.title}" approved`]
    );
    res.json({ success: true, message: 'Proposal approved' });
  } catch (error: any) {
    logger.error({ message: 'Error approving proposal', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to approve proposal' });
  }
};

export const reject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userRole = req.user?.role?.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ success: false, error: 'Only Managers and Admins can reject proposals' });
    }
    const [rows] = await db.query('SELECT * FROM proposals WHERE id = ? AND deleted_at IS NULL', [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, error: 'Proposal not found' });
    const proposal = (rows as any[])[0];
    await db.query('UPDATE proposals SET status = ?, rejection_reason = ? WHERE id = ?', ['Draft', reason || null, id]);
    await db.query(
      `INSERT INTO tender_activities (tender_id, user_id, activity_type, description) VALUES (?, ?, 'Updated', ?)`,
      [proposal.tender_id, req.user!.userId, `Proposal "${proposal.title}" rejected: ${reason || 'No reason given'}`]
    );
    res.json({ success: true, message: 'Proposal rejected and returned to Draft' });
  } catch (error: any) {
    logger.error({ message: 'Error rejecting proposal', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to reject proposal' });
  }
};

export const markSubmitted = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { submittedTo, submittedToEmail } = req.body;
    const [rows] = await db.query('SELECT * FROM proposals WHERE id = ? AND deleted_at IS NULL', [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, error: 'Proposal not found' });
    const proposal = (rows as any[])[0];
    if (proposal.status !== 'Approved') {
      return res.status(400).json({ success: false, error: 'Only approved proposals can be marked as submitted' });
    }
    await db.query('UPDATE proposals SET status = ?, submitted_to = ?, submitted_to_email = ?, submitted_at = NOW() WHERE id = ?',
      ['Submitted', submittedTo || null, submittedToEmail || null, id]);
    await db.query(
      `INSERT INTO tender_activities (tender_id, user_id, activity_type, description) VALUES (?, ?, 'Updated', ?)`,
      [proposal.tender_id, req.user!.userId, `Proposal "${proposal.title}" submitted to ${submittedTo || 'client'}`]
    );
    res.json({ success: true, message: 'Proposal marked as submitted' });
  } catch (error: any) {
    logger.error({ message: 'Error marking proposal submitted', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update proposal' });
  }
};

export const updateOutcome = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be Accepted or Rejected' });
    }
    const [rows] = await db.query('SELECT * FROM proposals WHERE id = ? AND deleted_at IS NULL', [id]);
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, error: 'Proposal not found' });
    const proposal = (rows as any[])[0];
    await db.query('UPDATE proposals SET status = ? WHERE id = ?', [status, id]);
    await db.query(
      `INSERT INTO tender_activities (tender_id, user_id, activity_type, description) VALUES (?, ?, 'Status Changed', ?)`,
      [proposal.tender_id, req.user!.userId, `Proposal "${proposal.title}" outcome: ${status}`]
    );
    res.json({ success: true, message: `Proposal marked as ${status}` });
  } catch (error: any) {
    logger.error({ message: 'Error updating outcome', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update outcome' });
  }
};

// ==================== Line Items ====================

export const getLineItems = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const [rows] = await db.query(
      `SELECT li.*, p.name as product_name, p.sku as product_sku
       FROM proposal_line_items li
       LEFT JOIN products p ON li.product_id = p.id
       WHERE li.proposal_id = ?
       ORDER BY li.display_order, li.id`, [proposalId]
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching line items', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch line items' });
  }
};

export const addLineItem = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { productId, parentLineItemId, itemName, itemDescription, itemType, sku, hsnCode,
      unitOfMeasure, quantity, unitPrice, taxRate, discountPercent, displayOrder, notes } = req.body;

    const qty = quantity || 1;
    const price = unitPrice || 0;
    const tax = taxRate ?? 18;
    const discount = discountPercent || 0;
    const subtotal = qty * price;
    const discountAmt = subtotal * (discount / 100);
    const taxAmt = (subtotal - discountAmt) * (tax / 100);
    const lineTotal = subtotal - discountAmt + taxAmt;

    const [result] = await db.query(
      `INSERT INTO proposal_line_items (proposal_id, product_id, parent_line_item_id, item_name, item_description,
        item_type, sku, hsn_code, unit_of_measure, quantity, unit_price, tax_rate, tax_amount,
        discount_percent, discount_amount, line_total, display_order, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [proposalId, productId || null, parentLineItemId || null, itemName, itemDescription || null,
        itemType || 'Product', sku || null, hsnCode || null, unitOfMeasure || 'Unit',
        qty, price, tax, taxAmt, discount, discountAmt, lineTotal, displayOrder || 0, notes || null]
    );

    // Recalculate proposal totals
    await recalcProposalTotals(Number(proposalId));

    const itemId = (result as any).insertId;
    const [rows] = await db.query('SELECT * FROM proposal_line_items WHERE id = ?', [itemId]);
    res.status(201).json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error adding line item', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add line item' });
  }
};

export const updateLineItem = async (req: Request, res: Response) => {
  try {
    const { proposalId, itemId } = req.params;
    const { quantity, unitPrice, taxRate, discountPercent, itemName, itemDescription, notes } = req.body;

    const fields: string[] = [];
    const params: any[] = [];
    if (itemName !== undefined) { fields.push('item_name = ?'); params.push(itemName); }
    if (itemDescription !== undefined) { fields.push('item_description = ?'); params.push(itemDescription); }
    if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }

    // Recalculate if pricing fields changed
    if (quantity !== undefined || unitPrice !== undefined || taxRate !== undefined || discountPercent !== undefined) {
      const [existing] = await db.query('SELECT * FROM proposal_line_items WHERE id = ?', [itemId]);
      if ((existing as any[]).length === 0) return res.status(404).json({ success: false, error: 'Line item not found' });
      const item = (existing as any[])[0];
      const qty = quantity ?? item.quantity;
      const price = unitPrice ?? item.unit_price;
      const tax = taxRate ?? item.tax_rate;
      const discount = discountPercent ?? item.discount_percent;
      const subtotal = qty * price;
      const discountAmt = subtotal * (discount / 100);
      const taxAmt = (subtotal - discountAmt) * (tax / 100);
      const lineTotal = subtotal - discountAmt + taxAmt;
      fields.push('quantity = ?', 'unit_price = ?', 'tax_rate = ?', 'tax_amount = ?', 'discount_percent = ?', 'discount_amount = ?', 'line_total = ?');
      params.push(qty, price, tax, taxAmt, discount, discountAmt, lineTotal);
    }

    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    params.push(itemId, proposalId);
    await db.query(`UPDATE proposal_line_items SET ${fields.join(', ')} WHERE id = ? AND proposal_id = ?`, params);
    await recalcProposalTotals(Number(proposalId));
    const [rows] = await db.query('SELECT * FROM proposal_line_items WHERE id = ?', [itemId]);
    res.json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error updating line item', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update line item' });
  }
};

export const removeLineItem = async (req: Request, res: Response) => {
  try {
    const { proposalId, itemId } = req.params;
    // Delete children first (BOM components)
    await db.query('DELETE FROM proposal_line_items WHERE parent_line_item_id = ?', [itemId]);
    await db.query('DELETE FROM proposal_line_items WHERE id = ? AND proposal_id = ?', [itemId, proposalId]);
    await recalcProposalTotals(Number(proposalId));
    res.json({ success: true, message: 'Line item removed' });
  } catch (error: any) {
    logger.error({ message: 'Error removing line item', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to remove line item' });
  }
};

export const addBundleToProposal = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { productId, quantity } = req.body;

    // Fetch bundle product + BOM
    const [products] = await db.query('SELECT * FROM products WHERE id = ? AND is_bundle = TRUE', [productId]);
    if ((products as any[]).length === 0) return res.status(404).json({ success: false, error: 'Bundle product not found' });
    const bundle = (products as any[])[0];

    const [components] = await db.query(
      `SELECT b.*, p.name, p.sku, p.unit_price, p.tax_rate, p.hsn_code, p.unit_of_measure, p.sub_category
       FROM product_bom b JOIN products p ON b.component_product_id = p.id
       WHERE b.parent_product_id = ? ORDER BY b.display_order`, [productId]
    );

    // Calculate bundle total from components
    const bundleQty = quantity || 1;
    let bundleTotal = 0;
    const comps = components as any[];
    for (const c of comps) {
      bundleTotal += (c.unit_price * c.quantity * bundleQty);
    }

    // Insert bundle line item
    const [bundleResult] = await db.query(
      `INSERT INTO proposal_line_items (proposal_id, product_id, item_name, item_description, item_type, sku,
        unit_of_measure, quantity, unit_price, tax_rate, tax_amount, line_total, display_order)
       VALUES (?, ?, ?, ?, 'Bundle', ?, 'Set', ?, ?, ?, ?, ?, 0)`,
      [proposalId, productId, bundle.name, bundle.description, bundle.sku,
        bundleQty, bundle.unit_price, bundle.tax_rate || 18,
        bundleTotal * ((bundle.tax_rate || 18) / 100), bundleTotal * (1 + (bundle.tax_rate || 18) / 100)]
    );
    const parentId = (bundleResult as any).insertId;

    // Insert components as child line items
    for (const c of comps) {
      const compQty = c.quantity * bundleQty;
      const compSubtotal = c.unit_price * compQty;
      const compTax = compSubtotal * ((c.tax_rate || 18) / 100);
      await db.query(
        `INSERT INTO proposal_line_items (proposal_id, product_id, parent_line_item_id, item_name, item_type,
          sku, hsn_code, unit_of_measure, quantity, unit_price, tax_rate, tax_amount, line_total, display_order)
         VALUES (?, ?, ?, ?, 'Component', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [proposalId, c.component_product_id, parentId, c.name, c.sku, c.hsn_code,
          c.unit_of_measure || 'Unit', compQty, c.unit_price, c.tax_rate || 18, compTax,
          compSubtotal + compTax, c.display_order || 0]
      );
    }

    await recalcProposalTotals(Number(proposalId));
    const [items] = await db.query('SELECT * FROM proposal_line_items WHERE proposal_id = ? ORDER BY display_order, id', [proposalId]);
    res.status(201).json({ success: true, data: items });
  } catch (error: any) {
    logger.error({ message: 'Error adding bundle', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add bundle' });
  }
};

// ==================== Versions ====================

export const getVersions = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const [rows] = await db.query(
      `SELECT v.*, u.full_name as uploaded_by_name
       FROM proposal_versions v
       LEFT JOIN users u ON v.uploaded_by = u.id
       WHERE v.proposal_id = ?
       ORDER BY v.version_number DESC`, [proposalId]
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching versions', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch versions' });
  }
};

// ==================== Helpers ====================

async function recalcProposalTotals(proposalId: number) {
  // Only sum top-level items (not components which are children of bundles)
  const [totals] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN parent_line_item_id IS NULL THEN quantity * unit_price ELSE 0 END), 0) as subtotal,
       COALESCE(SUM(CASE WHEN parent_line_item_id IS NULL THEN tax_amount ELSE 0 END), 0) as total_tax,
       COALESCE(SUM(CASE WHEN parent_line_item_id IS NULL THEN discount_amount ELSE 0 END), 0) as total_discount,
       COALESCE(SUM(CASE WHEN parent_line_item_id IS NULL THEN line_total ELSE 0 END), 0) as grand_total
     FROM proposal_line_items WHERE proposal_id = ?`, [proposalId]
  );
  const t = (totals as any[])[0];
  await db.query(
    'UPDATE proposals SET subtotal = ?, total_tax = ?, total_discount = ?, grand_total = ? WHERE id = ?',
    [t.subtotal, t.total_tax, t.total_discount, t.grand_total, proposalId]
  );
}
