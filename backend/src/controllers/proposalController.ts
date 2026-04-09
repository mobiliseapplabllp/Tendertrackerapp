import { Request, Response } from 'express';
import db from '../config/database';
import logger from '../utils/logger';

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
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching templates', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch templates' });
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
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching proposals', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
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

    return res.json({ success: true, data: proposal });
  } catch (error: any) {
    logger.error({ message: 'Error fetching proposal', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch proposal' });
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

    const validDays = Math.max(1, Math.min(validityPeriodDays || templateDefaults.validity_period_days || 30, 365));
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
    return res.status(201).json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error creating proposal', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to create proposal' });
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
    return res.json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error updating proposal', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to update proposal' });
  }
};

export const deleteProposal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE proposals SET deleted_at = NOW() WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Proposal deleted' });
  } catch (error: any) {
    logger.error({ message: 'Error deleting proposal', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to delete proposal' });
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
    return res.json({ success: true, message: 'Proposal submitted for approval' });
  } catch (error: any) {
    logger.error({ message: 'Error submitting proposal', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to submit proposal' });
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
    return res.json({ success: true, message: 'Proposal approved' });
  } catch (error: any) {
    logger.error({ message: 'Error approving proposal', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to approve proposal' });
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
    return res.json({ success: true, message: 'Proposal rejected and returned to Draft' });
  } catch (error: any) {
    logger.error({ message: 'Error rejecting proposal', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to reject proposal' });
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
    return res.json({ success: true, message: 'Proposal marked as submitted' });
  } catch (error: any) {
    logger.error({ message: 'Error marking proposal submitted', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to update proposal' });
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
    if (proposal.status !== 'Submitted') {
      return res.status(400).json({ success: false, error: 'Only submitted proposals can have outcomes recorded' });
    }
    await db.query('UPDATE proposals SET status = ? WHERE id = ?', [status, id]);
    await db.query(
      `INSERT INTO tender_activities (tender_id, user_id, activity_type, description) VALUES (?, ?, 'Status Changed', ?)`,
      [proposal.tender_id, req.user!.userId, `Proposal "${proposal.title}" outcome: ${status}`]
    );
    return res.json({ success: true, message: `Proposal marked as ${status}` });
  } catch (error: any) {
    logger.error({ message: 'Error updating outcome', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to update outcome' });
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
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching line items', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch line items' });
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
    return res.status(201).json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error adding line item', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to add line item' });
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
    return res.json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error updating line item', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to update line item' });
  }
};

export const removeLineItem = async (req: Request, res: Response) => {
  try {
    const { proposalId, itemId } = req.params;
    // Delete children first (BOM components)
    await db.query('DELETE FROM proposal_line_items WHERE parent_line_item_id = ?', [itemId]);
    await db.query('DELETE FROM proposal_line_items WHERE id = ? AND proposal_id = ?', [itemId, proposalId]);
    await recalcProposalTotals(Number(proposalId));
    return res.json({ success: true, message: 'Line item removed' });
  } catch (error: any) {
    logger.error({ message: 'Error removing line item', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to remove line item' });
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
    return res.status(201).json({ success: true, data: items });
  } catch (error: any) {
    logger.error({ message: 'Error adding bundle', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to add bundle' });
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
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching versions', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch versions' });
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

// ==================== Approve with Changes ====================

export const approveWithChanges = async (req: Request, res: Response) => {
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

    // Step 1: Snapshot current state as a version
    await db.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, file_path, file_name, original_name, change_note, grand_total, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, proposal.current_version, proposal.file_path || '', proposal.file_name || `v${proposal.current_version}`,
       proposal.original_name || '', `Original submission by creator`, proposal.grand_total, proposal.created_by]
    );

    // Step 2: Apply changes from request body
    const { title, coverLetter, executiveSummary, scopeOfWork, termsConditions, paymentTerms, warrantyTerms, changeNote } = req.body;
    const newVersion = (proposal.current_version || 1) + 1;

    const updates: string[] = ['current_version = ?', 'status = ?', 'approved_by = ?', 'approved_at = NOW()'];
    const params: any[] = [newVersion, 'Approved', req.user!.userId];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (coverLetter !== undefined) { updates.push('cover_letter = ?'); params.push(coverLetter); }
    if (executiveSummary !== undefined) { updates.push('executive_summary = ?'); params.push(executiveSummary); }
    if (scopeOfWork !== undefined) { updates.push('scope_of_work = ?'); params.push(scopeOfWork); }
    if (termsConditions !== undefined) { updates.push('terms_conditions = ?'); params.push(termsConditions); }
    if (paymentTerms !== undefined) { updates.push('payment_terms = ?'); params.push(paymentTerms); }
    if (warrantyTerms !== undefined) { updates.push('warranty_terms = ?'); params.push(warrantyTerms); }

    params.push(id);
    await db.query(`UPDATE proposals SET ${updates.join(', ')} WHERE id = ?`, params);

    // Step 3: Create version entry for the approved version
    await db.query(
      `INSERT INTO proposal_versions (proposal_id, version_number, file_path, file_name, change_note, grand_total, uploaded_by)
       VALUES (?, ?, '', ?, ?, ?, ?)`,
      [id, newVersion, `v${newVersion}`, changeNote || `Approved with changes by ${req.user!.fullName || 'Manager'}`,
       proposal.grand_total, req.user!.userId]
    );

    // Log activity
    await db.query(
      `INSERT INTO tender_activities (tender_id, user_id, activity_type, description) VALUES (?, ?, 'Updated', ?)`,
      [proposal.tender_id, req.user!.userId, `Proposal "${proposal.title}" approved with changes (v${newVersion})`]
    );

    logger.info({ message: 'Proposal approved with changes', proposalId: id, newVersion, approvedBy: req.user!.userId });
    return res.json({ success: true, message: `Proposal approved as version ${newVersion}` });
  } catch (error: any) {
    logger.error({ message: 'Error approving with changes', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to approve proposal' });
  }
};

// ==================== Pending Approvals (for managers) ====================

export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ success: false, error: 'Only managers can view pending approvals' });
    }
    const [rows] = await db.query(
      `SELECT p.*, t.title as lead_title, t.tender_number as lead_number,
       u.full_name as created_by_name, u.email as created_by_email
       FROM proposals p
       JOIN tenders t ON p.tender_id = t.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.status = 'Pending Approval' AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching pending approvals', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch pending approvals' });
  }
};

// ==================== AI Features ====================

export const aiGenerateProposal = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ success: false, error: 'Lead ID required' });

    // Fetch lead details
    const [leads] = await db.query(
      `SELECT t.*, c.company_name, c.address, c.city, c.state, c.country,
       pl.name as product_line_name
       FROM tenders t
       LEFT JOIN companies c ON t.company_id = c.id
       LEFT JOIN product_lines pl ON t.product_line_id = pl.id
       WHERE t.id = ?`, [leadId]
    );
    if ((leads as any[]).length === 0) return res.status(404).json({ success: false, error: 'Lead not found' });
    const lead = (leads as any[])[0];

    // Fetch relevant products from product line
    let products: any[] = [];
    if (lead.product_line_id) {
      const [prods] = await db.query(
        `SELECT p.*, (SELECT COUNT(*) FROM product_bom WHERE parent_product_id = p.id) as component_count
         FROM products p WHERE p.product_line_id = ? AND p.is_active = TRUE AND p.deleted_at IS NULL
         ORDER BY p.is_bundle DESC, p.name`, [lead.product_line_id]
      );
      products = prods as any[];
    }
    if (products.length === 0) {
      const [prods] = await db.query(
        `SELECT p.*, (SELECT COUNT(*) FROM product_bom WHERE parent_product_id = p.id) as component_count
         FROM products p WHERE p.is_standalone = TRUE AND p.is_active = TRUE AND p.deleted_at IS NULL
         ORDER BY p.sub_category, p.name LIMIT 20`
      );
      products = prods as any[];
    }

    // Build context for AI
    const clientName = lead.client || lead.company_name || 'the client';
    const companyAddress = [lead.address, lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '';
    // productList and dealValue available for future AI integration
    void products; // suppress unused warning

    // Generate proposal sections (without external AI - template-based for now)
    const proposalDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const proposalId = `${new Date().getFullYear()}/MAL/${String(leadId).padStart(5, '0')}`;

    const generated = {
      title: `Proposal for ${lead.title}`,
      proposalType: lead.sub_category === 'Software' ? 'Software' : lead.sub_category === 'Hardware' ? 'Hardware' : 'Custom Development',
      coverLetter: `Dear ${clientName},\n\nWe are pleased to submit our proposal for ${lead.title}. Mobilise App Lab Limited is a leading technology solutions provider specializing in ${lead.product_line_name || 'enterprise solutions'}.\n\nThis proposal outlines our comprehensive solution, scope of work, and commercial terms for your consideration. We are confident that our solution will meet your requirements and deliver significant value.\n\nWe look forward to the opportunity to partner with you on this initiative.`,
      executiveSummary: `Mobilise App Lab Limited is pleased to present this proposal in response to ${clientName}'s requirement for ${lead.product_line_name || 'technology'} solutions.\n\nOur approach is built on deep domain expertise, proven deployment methodology, and a commitment to delivering measurable business outcomes. We have designed a comprehensive solution that addresses your operational needs while ensuring scalability, security, and ease of use.\n\nKey highlights of our proposal:\n• End-to-end solution covering hardware, software, and services\n• Proven track record with similar deployments across industries\n• Dedicated project management and post-deployment support\n• Flexible engagement model aligned with your business priorities\n\nWe believe this engagement will strengthen operational efficiency, improve visibility, and create long-term value for your organization.`,
      scopeOfWork: `The scope of work for this project includes:\n\n1. Supply and delivery of all specified hardware/software components\n2. Installation and configuration at the client site\n3. System integration and testing\n4. User training and handover documentation\n5. Post-implementation support during warranty period\n\nClient responsibilities:\n• Provide site access and necessary infrastructure (power, network)\n• Designate a project coordinator for timely communication\n• Provide user data for system enrollment`,
      notes: `• Installation will be completed within 2-3 working days after order confirmation and payment.\n• All hardware comes with standard manufacturer warranty.\n• Power supply and internet connectivity to be provided by the client.\n• Year 2 onwards, AMC/CMC available at additional cost.`,
      termsConditions: `• Order confirmation against Purchase Order and advance payment.\n• Prices are exclusive of applicable taxes (GST @ 18%).\n• Procurement and implementation shall commence post PO and payment.\n• Termination notice of 30 days from either party shall be applicable.\n• In case of special requirements (VAPT certification, etc.), additional charges may apply.\n• All intellectual property of standard products remains with Mobilise App Lab Limited.`,
      paymentTerms: `Payment Terms:\n• 50% advance with Purchase Order\n• 30% on delivery and installation\n• 20% post go-live and acceptance\n\nPayment due within 15 days of invoice.\nAll payments to be made via NEFT/RTGS to Mobilise App Lab Limited.`,
      warrantyTerms: `Warranty & Support:\n• Hardware: 12 months manufacturer warranty from date of installation\n• Software: 12 months from go-live date (includes bug fixes and minor updates)\n• On-site support during warranty period for critical issues\n• Post-warranty AMC/CMC available at mutually agreed rates`,
      validityPeriodDays: 30,
      suggestedItems: products.filter((p: any) => p.is_standalone).slice(0, 10).map((p: any) => ({
        productId: p.id, name: p.name, sku: p.sku, unitPrice: p.unit_price,
        taxRate: p.tax_rate, isBundle: !!p.is_bundle, componentCount: p.component_count
      })),
      metadata: { proposalDate, proposalId, clientName, companyAddress, leadTitle: lead.title, productLineName: lead.product_line_name }
    };

    return res.json({ success: true, data: generated });
  } catch (error: any) {
    logger.error({ message: 'Error generating proposal', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to generate proposal' });
  }
};

export const aiRefineSection = async (req: Request, res: Response) => {
  try {
    const { section, currentText, leadContext } = req.body;
    if (!section || !currentText) return res.status(400).json({ success: false, error: 'Section and current text required' });

    // Template-based refinement (can be enhanced with actual AI API later)
    let refined = currentText;
    const ctx = leadContext || {};

    switch (section) {
      case 'coverLetter':
        refined = `Dear ${ctx.clientName || 'Sir/Madam'},\n\nThank you for the opportunity to present our proposal for ${ctx.leadTitle || 'your project'}. Mobilise App Lab Limited brings extensive experience in delivering enterprise technology solutions.\n\nWe have carefully analyzed your requirements and designed a solution that addresses your specific needs while ensuring scalability and reliability.\n\nWe are committed to delivering excellence and look forward to building a long-term partnership.\n\nBest regards,\nMobilise App Lab Limited`;
        break;
      case 'executiveSummary':
        refined = `${ctx.clientName ? ctx.clientName + ' has' : 'The client has'} identified a strategic need to modernize and strengthen its ${ctx.productLineName || 'operational'} capabilities. Mobilise App Lab Limited brings a proven track record of delivering end-to-end technology solutions that drive operational efficiency, enhance visibility, and reduce costs.\n\nOur approach is guided by three core principles:\n\n1. Business-First Design — Every recommendation is rooted in your operational reality, not just technology capabilities.\n2. Scalable Architecture — Solutions are built to grow with your organization, ensuring long-term value.\n3. Partnership Model — We work as an extension of your team, ensuring knowledge transfer and self-sufficiency.\n\nThis proposal outlines a comprehensive engagement covering solution design, deployment, training, and ongoing support. We are confident in our ability to deliver measurable impact within the agreed timelines.`;
        break;
      case 'scopeOfWork':
        refined = currentText + '\n\nAdditional Deliverables:\n• Detailed project plan with milestones\n• Weekly progress reports\n• Complete documentation (technical + user manuals)\n• Knowledge transfer sessions';
        break;
      case 'termsConditions':
        refined = `• This proposal is valid for 30 days from the date of issue.\n• Order confirmation against Purchase Order and 100% advance payment including GST.\n• Prices are exclusive of applicable taxes.\n• No minimum order commitment with retail rates.\n• Procurement & Implementation shall commence post PO and advance payment.\n• Termination or Discontinuation Notice of six (6) months from either party.\n• All disputes subject to jurisdiction of Faridabad, Haryana courts.`;
        break;
      default:
        refined = currentText;
    }

    return res.json({ success: true, data: { section, refined } });
  } catch (error: any) {
    logger.error({ message: 'Error refining section', error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to refine section' });
  }
};
