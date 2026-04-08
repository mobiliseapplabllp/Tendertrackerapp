import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { logger } from '../utils/logger';

// ==================== Categories ====================

export const getCategories = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM product_categories WHERE is_active = TRUE ORDER BY display_order, name'
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    logger.error({ message: 'Error fetching product categories', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, parentId, icon, displayOrder } = req.body;
    const [result] = await db.query(
      'INSERT INTO product_categories (name, description, parent_id, icon, display_order) VALUES (?, ?, ?, ?, ?)',
      [name, description || null, parentId || null, icon || null, displayOrder || 0]
    );
    const id = (result as any).insertId;
    const [rows] = await db.query('SELECT * FROM product_categories WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error creating category', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, parentId, icon, isActive, displayOrder } = req.body;
    const fields: string[] = [];
    const params: any[] = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (parentId !== undefined) { fields.push('parent_id = ?'); params.push(parentId); }
    if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
    if (isActive !== undefined) { fields.push('is_active = ?'); params.push(isActive); }
    if (displayOrder !== undefined) { fields.push('display_order = ?'); params.push(displayOrder); }
    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    params.push(id);
    await db.query(`UPDATE product_categories SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await db.query('SELECT * FROM product_categories WHERE id = ?', [id]);
    res.json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error updating category', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [products] = await db.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
    if ((products as any[])[0].count > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete category with products. Reassign products first.' });
    }
    await db.query('UPDATE product_categories SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Category deactivated' });
  } catch (error: any) {
    logger.error({ message: 'Error deleting category', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
};

// ==================== Products ====================

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { search, categoryId, productLineId, subCategory, isBundle, isActive, page = 1, pageSize = 50 } = req.query;
    let where = 'p.deleted_at IS NULL';
    const params: any[] = [];

    if (search) { where += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
    if (categoryId) { where += ' AND p.category_id = ?'; params.push(categoryId); }
    if (productLineId) { where += ' AND p.product_line_id = ?'; params.push(productLineId); }
    if (subCategory) { where += ' AND p.sub_category = ?'; params.push(subCategory); }
    if (isBundle !== undefined) { where += ' AND p.is_bundle = ?'; params.push(isBundle === 'true'); }
    if (isActive !== undefined) { where += ' AND p.is_active = ?'; params.push(isActive === 'true'); }
    else { where += ' AND p.is_active = TRUE'; }

    const offset = (Number(page) - 1) * Number(pageSize);
    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM products p WHERE ${where}`, params);
    const total = (countResult as any[])[0].total;

    const [rows] = await db.query(
      `SELECT p.*, pc.name as category_name, pl.name as product_line_name,
       (SELECT COUNT(*) FROM product_bom WHERE parent_product_id = p.id) as component_count
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN product_lines pl ON p.product_line_id = pl.id
       WHERE ${where}
       ORDER BY p.name
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );
    res.json({ success: true, data: { data: rows, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / Number(pageSize)) } });
  } catch (error: any) {
    logger.error({ message: 'Error fetching products', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT p.*, pc.name as category_name, pl.name as product_line_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN product_lines pl ON p.product_line_id = pl.id
       WHERE p.id = ? AND p.deleted_at IS NULL`, [id]
    );
    if ((rows as any[]).length === 0) return res.status(404).json({ success: false, error: 'Product not found' });

    const product = (rows as any[])[0];

    // If bundle, fetch BOM components
    if (product.is_bundle) {
      const [components] = await db.query(
        `SELECT b.*, cp.name as component_name, cp.sku as component_sku,
         cp.unit_price as component_price, cp.sub_category as component_type,
         cp.unit_of_measure, cp.tax_rate as component_tax_rate, cp.hsn_code as component_hsn
         FROM product_bom b
         JOIN products cp ON b.component_product_id = cp.id
         WHERE b.parent_product_id = ?
         ORDER BY b.display_order, cp.name`, [id]
      );
      product.components = components;
    }
    res.json({ success: true, data: product });
  } catch (error: any) {
    logger.error({ message: 'Error fetching product', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { sku, name, description, categoryId, productLineId, subCategory, unitPrice, currency, unitOfMeasure, taxRate, hsnCode, isStandalone, isBundle, imageUrl, tags } = req.body;
    const [result] = await db.query(
      `INSERT INTO products (sku, name, description, category_id, product_line_id, sub_category, unit_price, currency, unit_of_measure, tax_rate, hsn_code, is_standalone, is_bundle, image_url, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sku || null, name, description || null, categoryId, productLineId || null, subCategory || 'Hardware',
       unitPrice || 0, currency || 'INR', unitOfMeasure || 'Unit', taxRate ?? 18, hsnCode || null,
       isStandalone ?? true, isBundle ?? false, imageUrl || null, tags ? JSON.stringify(tags) : null, req.user!.userId]
    );
    const id = (result as any).insertId;
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    logger.info({ message: 'Product created', productId: id, createdBy: req.user!.userId });
    res.status(201).json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'SKU already exists' });
    logger.error({ message: 'Error creating product', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allowedFields: Record<string, string> = {
      sku: 'sku', name: 'name', description: 'description', categoryId: 'category_id',
      productLineId: 'product_line_id', subCategory: 'sub_category', unitPrice: 'unit_price',
      currency: 'currency', unitOfMeasure: 'unit_of_measure', taxRate: 'tax_rate',
      hsnCode: 'hsn_code', isStandalone: 'is_standalone', isBundle: 'is_bundle',
      isActive: 'is_active', imageUrl: 'image_url', tags: 'tags'
    };
    const fields: string[] = [];
    const params: any[] = [];
    for (const [key, col] of Object.entries(allowedFields)) {
      if (req.body[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push(key === 'tags' ? JSON.stringify(req.body[key]) : req.body[key]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    params.push(id);
    await db.query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json({ success: true, data: (rows as any[])[0] });
  } catch (error: any) {
    logger.error({ message: 'Error updating product', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE products SET deleted_at = NOW() WHERE id = ?', [id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    logger.error({ message: 'Error deleting product', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
};

// ==================== BOM Management ====================

export const getBOM = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [components] = await db.query(
      `SELECT b.*, p.name as component_name, p.sku, p.unit_price, p.sub_category,
       p.unit_of_measure, p.tax_rate, p.hsn_code, p.is_active
       FROM product_bom b
       JOIN products p ON b.component_product_id = p.id
       WHERE b.parent_product_id = ?
       ORDER BY b.display_order, p.name`, [id]
    );
    res.json({ success: true, data: components });
  } catch (error: any) {
    logger.error({ message: 'Error fetching BOM', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch BOM' });
  }
};

export const addBOMComponent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // parent product ID
    const { componentProductId, quantity, isOptional, displayOrder, notes } = req.body;
    if (Number(id) === Number(componentProductId)) {
      return res.status(400).json({ success: false, error: 'Product cannot be a component of itself' });
    }
    await db.query(
      'INSERT INTO product_bom (parent_product_id, component_product_id, quantity, is_optional, display_order, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, componentProductId, quantity || 1, isOptional ?? false, displayOrder || 0, notes || null]
    );
    // Mark parent as bundle
    await db.query('UPDATE products SET is_bundle = TRUE WHERE id = ?', [id]);
    const [components] = await db.query(
      `SELECT b.*, p.name as component_name, p.sku, p.unit_price
       FROM product_bom b JOIN products p ON b.component_product_id = p.id
       WHERE b.parent_product_id = ? ORDER BY b.display_order`, [id]
    );
    res.status(201).json({ success: true, data: components });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Component already in BOM' });
    logger.error({ message: 'Error adding BOM component', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to add component' });
  }
};

export const updateBOMComponent = async (req: Request, res: Response) => {
  try {
    const { id, bomId } = req.params;
    const { quantity, isOptional, displayOrder, notes } = req.body;
    await db.query(
      'UPDATE product_bom SET quantity = ?, is_optional = ?, display_order = ?, notes = ? WHERE id = ? AND parent_product_id = ?',
      [quantity, isOptional ?? false, displayOrder || 0, notes || null, bomId, id]
    );
    res.json({ success: true, message: 'BOM component updated' });
  } catch (error: any) {
    logger.error({ message: 'Error updating BOM', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update component' });
  }
};

export const removeBOMComponent = async (req: Request, res: Response) => {
  try {
    const { id, bomId } = req.params;
    await db.query('DELETE FROM product_bom WHERE id = ? AND parent_product_id = ?', [bomId, id]);
    // Check if product still has components
    const [remaining] = await db.query('SELECT COUNT(*) as count FROM product_bom WHERE parent_product_id = ?', [id]);
    if ((remaining as any[])[0].count === 0) {
      await db.query('UPDATE products SET is_bundle = FALSE WHERE id = ?', [id]);
    }
    res.json({ success: true, message: 'Component removed from BOM' });
  } catch (error: any) {
    logger.error({ message: 'Error removing BOM component', error: error.message });
    res.status(500).json({ success: false, error: 'Failed to remove component' });
  }
};
