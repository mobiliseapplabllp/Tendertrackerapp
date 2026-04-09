import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import {
  Package, Plus, Search, Loader2, Edit2, Trash2, Cpu, Code, Wrench,
  Box, ChevronDown, ChevronRight, X
} from 'lucide-react';
import { productCatalogApi, productLineApi } from '../lib/api';
import { useSettings } from '../hooks/useSettings';

export function ProductCatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productLineFilter, setProductLineFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [expandedBOM, setExpandedBOM] = useState<Set<number>>(new Set());
  const [bomData, setBomData] = useState<Record<number, any[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [manageBOM, setManageBOM] = useState<any>(null); // product being managed
  const [bomSearch, setBomSearch] = useState('');
  const [bomSearchResults, setBomSearchResults] = useState<any[]>([]);
  const [addingComponent, setAddingComponent] = useState(false);
  const [componentQty, setComponentQty] = useState('1');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', sku: '', unitPrice: '', subCategory: 'Hardware', categoryId: '', qty: '1', sellSeparately: false });
  const { formatCurrency } = useSettings();

  const [form, setForm] = useState({
    sku: '', name: '', description: '', categoryId: '', productLineId: '',
    subCategory: 'Hardware', unitPrice: '', currency: 'INR', unitOfMeasure: 'Unit',
    taxRate: '18', hsnCode: '', isStandalone: true, isBundle: false,
  });

  useEffect(() => {
    Promise.all([fetchCategories(), fetchProductLines()]).then(() => fetchProducts());
  }, []);

  useEffect(() => { fetchProducts(); }, [page, categoryFilter, productLineFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = { page: String(page), pageSize: '25', isStandalone: 'true' };
      if (search) params.search = search;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (productLineFilter) params.productLineId = productLineFilter;
      const res = await productCatalogApi.getAll(params);
      if (res.success && res.data) {
        setProducts(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    const res = await productCatalogApi.getCategories();
    if (res.success) setCategories(res.data || []);
  };

  const fetchProductLines = async () => {
    const res = await productLineApi.getAll();
    if (res.success) setProductLines(Array.isArray(res.data) ? res.data : res.data?.data || []);
  };

  const resetForm = () => setForm({ sku: '', name: '', description: '', categoryId: '', productLineId: '',
    subCategory: 'Hardware', unitPrice: '', currency: 'INR', unitOfMeasure: 'Unit',
    taxRate: '18', hsnCode: '', isStandalone: true, isBundle: false });

  const handleCreate = async () => {
    if (!form.name || !form.categoryId) { setError('Name and category required'); return; }
    setError(null);
    const payload = {
      ...form, categoryId: Number(form.categoryId),
      productLineId: form.productLineId ? Number(form.productLineId) : null,
      unitPrice: Number(form.unitPrice) || 0, taxRate: Number(form.taxRate) || 18,
    };
    const res = editingProduct
      ? await productCatalogApi.update(editingProduct.id, payload)
      : await productCatalogApi.create(payload);
    if (res.success) {
      setShowCreate(false); setEditingProduct(null); resetForm(); fetchProducts();
    } else { setError(res.error || 'Failed to save'); }
  };

  const handleEdit = (p: any) => {
    setEditingProduct(p);
    setForm({
      sku: p.sku || '', name: p.name || '', description: p.description || '',
      categoryId: String(p.category_id || ''), productLineId: String(p.product_line_id || ''),
      subCategory: p.sub_category || 'Hardware', unitPrice: String(p.unit_price || ''),
      currency: p.currency || 'INR', unitOfMeasure: p.unit_of_measure || 'Unit',
      taxRate: String(p.tax_rate || '18'), hsnCode: p.hsn_code || '',
      isStandalone: p.is_standalone ?? true, isBundle: p.is_bundle ?? false,
    });
    setShowCreate(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    await productCatalogApi.delete(id);
    fetchProducts();
  };

  const toggleBOM = async (productId: number) => {
    const next = new Set(expandedBOM);
    if (next.has(productId)) { next.delete(productId); }
    else {
      if (!bomData[productId]) {
        const res = await productCatalogApi.getBOM(productId);
        if (res.success) setBomData(prev => ({ ...prev, [productId]: res.data || [] }));
      }
      next.add(productId);
    }
    setExpandedBOM(next);
  };

  // BOM Management
  const openBOMManager = async (product: any) => {
    setManageBOM(product);
    setBomSearch(''); setBomSearchResults([]); setComponentQty('1');
    const res = await productCatalogApi.getBOM(product.id);
    if (res.success) setBomData(prev => ({ ...prev, [product.id]: res.data || [] }));
  };

  const searchBOMProducts = async (query: string) => {
    if (!query.trim()) { setBomSearchResults([]); return; }
    const res = await productCatalogApi.getAll({ search: query, pageSize: '20' });
    if (res.success) {
      // Exclude the parent product and existing BOM components
      const existingIds = new Set((bomData[manageBOM?.id] || []).map((c: any) => c.component_product_id));
      existingIds.add(manageBOM?.id);
      setBomSearchResults((res.data?.data || []).filter((p: any) => !existingIds.has(p.id)));
    }
  };

  const handleAddBOMComponent = async (componentId: number) => {
    if (!manageBOM) return;
    setAddingComponent(true);
    try {
      const res = await productCatalogApi.addBOMComponent(manageBOM.id, {
        componentProductId: componentId,
        quantity: Number(componentQty) || 1,
      });
      if (res.success) {
        setBomData(prev => ({ ...prev, [manageBOM.id]: res.data || [] }));
        setBomSearch(''); setBomSearchResults([]); setComponentQty('1');
        fetchProducts(); // Refresh to update bundle badge + component count
      } else { alert(res.error || 'Failed to add component'); }
    } catch (err: any) { alert(err.message); }
    finally { setAddingComponent(false); }
  };

  const [editingComponentId, setEditingComponentId] = useState<number | null>(null);

  const handleUpdateProductFromBOM = async (productId: number, updates: any) => {
    try {
      const res = await productCatalogApi.update(productId, updates);
      if (res.success && manageBOM) {
        // Refresh BOM data to show updated name/price
        const refreshed = await productCatalogApi.getBOM(manageBOM.id);
        if (refreshed.success) setBomData(prev => ({ ...prev, [manageBOM.id]: refreshed.data || [] }));
      }
    } catch (err: any) { alert(err.message); }
  };

  const handleUpdateBOMComponent = async (bomId: number, updates: { quantity?: number; isOptional?: boolean }) => {
    if (!manageBOM) return;
    try {
      await productCatalogApi.updateBOMComponent(manageBOM.id, bomId, updates);
      const refreshed = await productCatalogApi.getBOM(manageBOM.id);
      if (refreshed.success) setBomData(prev => ({ ...prev, [manageBOM.id]: refreshed.data || [] }));
    } catch (err: any) { alert(err.message); }
  };

  const handleRemoveBOMComponent = async (bomId: number) => {
    if (!manageBOM || !confirm('Remove this component from the bundle?')) return;
    const res = await productCatalogApi.removeBOMComponent(manageBOM.id, bomId);
    if (res.success) {
      const refreshed = await productCatalogApi.getBOM(manageBOM.id);
      if (refreshed.success) setBomData(prev => ({ ...prev, [manageBOM.id]: refreshed.data || [] }));
      fetchProducts();
    }
  };

  const handleQuickAddComponent = async () => {
    if (!manageBOM || !quickAddForm.name || !quickAddForm.categoryId) { alert('Name and category are required'); return; }
    setAddingComponent(true);
    try {
      // Step 1: Create the product
      const createRes = await productCatalogApi.create({
        name: quickAddForm.name, sku: quickAddForm.sku || null,
        categoryId: Number(quickAddForm.categoryId),
        subCategory: quickAddForm.subCategory,
        unitPrice: Number(quickAddForm.unitPrice) || 0,
        taxRate: 18, isStandalone: quickAddForm.sellSeparately, isBundle: false,
      });
      if (!createRes.success) { alert(createRes.error || 'Failed to create product'); return; }

      // Step 2: Add to BOM
      const bomRes = await productCatalogApi.addBOMComponent(manageBOM.id, {
        componentProductId: createRes.data.id,
        quantity: Number(quickAddForm.qty) || 1,
      });
      if (bomRes.success) {
        setBomData(prev => ({ ...prev, [manageBOM.id]: bomRes.data || [] }));
        setQuickAddForm({ name: '', sku: '', unitPrice: '', subCategory: 'Hardware', categoryId: '', qty: '1', sellSeparately: false });
        setShowQuickAdd(false);
        fetchProducts();
      } else { alert(bomRes.error || 'Product created but failed to add to BOM'); }
    } catch (err: any) { alert(err.message); }
    finally { setAddingComponent(false); }
  };

  const subCatIcon = (type: string) => {
    switch (type) {
      case 'Hardware': return <Cpu className="w-3.5 h-3.5" />;
      case 'Software': return <Code className="w-3.5 h-3.5" />;
      case 'Service': return <Wrench className="w-3.5 h-3.5" />;
      default: return <Box className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <header className="bg-white border-b flex-shrink-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Product Catalog</h1>
              <p className="text-sm text-muted-foreground">Manage products, bundles, and BOM</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" />Add Product</Button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 flex gap-2">
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchProducts(); } }} className="max-w-xs text-sm" />
          <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchProducts(); }}><Search className="w-3.5 h-3.5" /></Button>
        </div>
        <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={productLineFilter} onValueChange={v => { setProductLineFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Product Line" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lines</SelectItem>
            {productLines.map((pl: any) => <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-blue-50 border-b px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">{editingProduct ? `Edit: ${editingProduct.name}` : 'New Product'}</h3>
            <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setEditingProduct(null); resetForm(); }}><X className="w-4 h-4" /></Button>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700 mb-3">{error}</div>}
          <div className="grid grid-cols-4 gap-3">
            <div><Label className="text-xs">SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="text-sm" placeholder="e.g., BIO-001" /></div>
            <div className="col-span-2"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="text-sm" /></div>
            <div><Label className="text-xs">Category *</Label>
              <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={form.subCategory} onValueChange={v => setForm({ ...form, subCategory: v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{['Hardware', 'Software', 'Service', 'Consumable'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Unit Price</Label><Input type="number" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} className="text-sm" /></div>
            <div><Label className="text-xs">Tax Rate %</Label><Input type="number" value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })} className="text-sm" /></div>
            <div><Label className="text-xs">HSN Code</Label><Input value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} className="text-sm" /></div>
            <div><Label className="text-xs">Product Line</Label>
              <Select value={form.productLineId} onValueChange={v => setForm({ ...form, productLineId: v })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{productLines.map((pl: any) => <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Unit</Label><Input value={form.unitOfMeasure} onChange={e => setForm({ ...form, unitOfMeasure: e.target.value })} className="text-sm" /></div>
          </div>
          <div className="mt-3"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="text-sm" rows={2} /></div>
          <Button className="mt-3" onClick={handleCreate}><Plus className="w-3 h-3 mr-1" />{editingProduct ? 'Save Changes' : 'Create Product'}</Button>
        </div>
      )}

      {/* Product List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-500"><Package className="w-10 h-10 mx-auto mb-3 text-gray-300" /><p>No products found</p></div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Product Line</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-center">BOM</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <>
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {!!p.is_bundle && (
                            <button onClick={() => toggleBOM(p.id)} className="text-gray-500 hover:text-gray-600">
                              {expandedBOM.has(p.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                          {p.name}
                          {!!p.is_bundle && <Badge className="text-xs bg-purple-600 text-white">Bundle</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.sku || '-'}</td>
                      <td className="px-4 py-3">{p.category_name}</td>
                      <td className="px-4 py-3"><span className="flex items-center gap-1">{subCatIcon(p.sub_category)}{p.sub_category}</span></td>
                      <td className="px-4 py-3">{p.product_line_name || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.unit_price, undefined, { compact: false })}</td>
                      <td className="px-4 py-3 text-right">{p.tax_rate}%</td>
                      <td className="px-4 py-3 text-center">{p.component_count > 0 ? <Badge variant="outline" className="text-xs">{p.component_count}</Badge> : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => openBOMManager(p)} title="Manage BOM">
                            <Box className="w-3.5 h-3.5 mr-1" />BOM
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)} title="Edit"><Edit2 className="w-3.5 h-3.5 text-blue-500" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                    {expandedBOM.has(p.id) && bomData[p.id]?.map((comp: any) => (
                      <tr key={`bom-${comp.id}`} className="bg-gray-50/50 border-t">
                        <td className="px-4 py-2 pl-12 text-xs text-gray-600">↳ {comp.component_name}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{comp.sku || '-'}</td>
                        <td className="px-4 py-2 text-xs" colSpan={2}>Qty: {comp.quantity}</td>
                        <td className="px-4 py-2 text-xs">{comp.is_optional ? 'Optional' : 'Required'}</td>
                        <td className="px-4 py-2 text-xs text-right">{formatCurrency(comp.unit_price, undefined, { compact: false })}</td>
                        <td colSpan={3}></td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      {/* BOM Management Panel */}
      {manageBOM && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setManageBOM(null)} />
          <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-semibold text-lg">BOM: {manageBOM.name}</h2>
                <p className="text-xs text-gray-500">{manageBOM.sku || 'No SKU'} · {!!manageBOM.is_bundle ? 'Bundle' : 'Standalone product'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setManageBOM(null)}><X className="w-5 h-5" /></Button>
            </div>

            {/* Add Component */}
            <div className="px-5 py-3 bg-blue-50 border-b space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Add Component</Label>
                <Button size="sm" variant={showQuickAdd ? "default" : "outline"} className="h-6 text-xs px-2"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}>
                  {showQuickAdd ? 'Search Existing' : '+ Quick Create'}
                </Button>
              </div>

              {showQuickAdd ? (
                /* Quick Add Form */
                <div className="space-y-2 bg-white rounded-lg p-3 border">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs text-gray-500">Name *</Label>
                      <Input value={quickAddForm.name} onChange={e => setQuickAddForm({ ...quickAddForm, name: e.target.value })} className="text-xs h-7" placeholder="e.g., Power Adapter" /></div>
                    <div><Label className="text-xs text-gray-500">SKU</Label>
                      <Input value={quickAddForm.sku} onChange={e => setQuickAddForm({ ...quickAddForm, sku: e.target.value })} className="text-xs h-7" placeholder="e.g., BIO-PWR-001" /></div>
                    <div><Label className="text-xs text-gray-500">Category *</Label>
                      <Select value={quickAddForm.categoryId} onValueChange={v => setQuickAddForm({ ...quickAddForm, categoryId: v })}>
                        <SelectTrigger className="text-xs h-7"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><Label className="text-xs text-gray-500">Type</Label>
                      <Select value={quickAddForm.subCategory} onValueChange={v => setQuickAddForm({ ...quickAddForm, subCategory: v })}>
                        <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                        <SelectContent>{['Hardware', 'Software', 'Service', 'Consumable'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><Label className="text-xs text-gray-500">Unit Price</Label>
                      <Input type="number" value={quickAddForm.unitPrice} onChange={e => setQuickAddForm({ ...quickAddForm, unitPrice: e.target.value })} className="text-xs h-7" placeholder="0" /></div>
                    <div><Label className="text-xs text-gray-500">Quantity</Label>
                      <Input type="number" value={quickAddForm.qty} onChange={e => setQuickAddForm({ ...quickAddForm, qty: e.target.value })} className="text-xs h-7" min="1" /></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={quickAddForm.sellSeparately}
                        onChange={e => setQuickAddForm({ ...quickAddForm, sellSeparately: e.target.checked })}
                        className="rounded border-gray-300" />
                      <span className="text-xs text-gray-600">Also sell separately in catalog</span>
                    </label>
                    <Button size="sm" className="h-7 text-xs" onClick={handleQuickAddComponent} disabled={addingComponent}>
                      {addingComponent ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                      Create & Add
                    </Button>
                  </div>
                </div>
              ) : (
                /* Search Existing */
                <div className="flex gap-2">
                  <Input
                    placeholder="Search products to add..."
                    value={bomSearch}
                    onChange={e => setBomSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') searchBOMProducts(bomSearch); }}
                    className="text-sm flex-1"
                  />
                  <Input
                    type="number" placeholder="Qty" value={componentQty}
                    onChange={e => setComponentQty(e.target.value)}
                    className="text-sm w-16"
                    min="1"
                  />
                  <Button size="sm" onClick={() => searchBOMProducts(bomSearch)}>
                    <Search className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              {bomSearchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 mt-1">
                  {bomSearchResults.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-white p-2 rounded border text-xs cursor-pointer hover:bg-indigo-50 transition-colors"
                      onClick={() => handleAddBOMComponent(p.id)}
                    >
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {p.sku && <span className="text-gray-500 ml-1">({p.sku})</span>}
                        <Badge className="ml-1 text-xs" variant="outline">{p.sub_category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{formatCurrency(p.unit_price, undefined, { compact: false })}</span>
                        <Plus className="w-3.5 h-3.5 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {addingComponent && <div className="flex items-center gap-2 text-xs text-indigo-600"><Loader2 className="w-3 h-3 animate-spin" />Adding...</div>}
            </div>

            {/* Component List */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Components ({(bomData[manageBOM.id] || []).length})</h3>
                {(bomData[manageBOM.id] || []).length > 0 && (
                  <span className="text-xs text-gray-500">
                    Total: {formatCurrency(
                      (bomData[manageBOM.id] || []).reduce((sum: number, c: any) => sum + (c.unit_price || 0) * (c.quantity || 1), 0),
                      undefined, { compact: false }
                    )}
                  </span>
                )}
              </div>

              {(bomData[manageBOM.id] || []).length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Box className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No components yet</p>
                  <p className="text-xs">Search and add products above to build a bundle</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(bomData[manageBOM.id] || []).map((comp: any, idx: number) => {
                    const isEditing = editingComponentId === comp.component_product_id;
                    return (
                    <div key={comp.id} className="bg-gray-50 rounded-lg p-3 border space-y-2">
                      {/* Header Row */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-bold text-xs">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-sm truncate">{comp.component_name}</span>
                            {comp.sku && <span className="text-xs text-gray-500">({comp.sku})</span>}
                          </div>
                          <span className="text-xs text-gray-500">{formatCurrency(comp.unit_price, undefined, { compact: false })}/unit</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                          onClick={() => setEditingComponentId(isEditing ? null : comp.component_product_id)}
                          title="Edit details">
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
                          onClick={() => handleRemoveBOMComponent(comp.id)} title="Remove">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>

                      {/* BOM Fields (always visible) */}
                      <div className="flex items-center gap-3 pl-11">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs text-gray-500">Qty:</Label>
                          <Input type="number" min="0.01" step="0.01"
                            defaultValue={comp.quantity}
                            className="w-16 h-6 text-xs"
                            onBlur={e => {
                              const val = Number(e.target.value);
                              if (val > 0 && val !== comp.quantity) handleUpdateBOMComponent(comp.id, { quantity: val });
                            }}
                          />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!comp.is_optional}
                            onChange={e => handleUpdateBOMComponent(comp.id, { isOptional: e.target.checked })}
                            className="rounded border-gray-300 h-3 w-3" />
                          <span className="text-xs text-gray-500">Optional</span>
                        </label>
                        <span className="text-xs font-medium text-gray-700 ml-auto">
                          = {formatCurrency((comp.unit_price || 0) * (comp.quantity || 1), undefined, { compact: false })}
                        </span>
                      </div>

                      {/* Expandable Product Details Edit */}
                      {isEditing && (
                        <div className="pl-11 pt-2 border-t mt-2 space-y-2">
                          <p className="text-xs text-indigo-600 font-medium">Edit Product Details</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs text-gray-500">Name</Label>
                              <Input defaultValue={comp.component_name} className="text-xs h-6"
                                onBlur={e => { if (e.target.value !== comp.component_name) handleUpdateProductFromBOM(comp.component_product_id, { name: e.target.value }); }} /></div>
                            <div><Label className="text-xs text-gray-500">SKU</Label>
                              <Input defaultValue={comp.sku || ''} className="text-xs h-6"
                                onBlur={e => { if (e.target.value !== (comp.sku || '')) handleUpdateProductFromBOM(comp.component_product_id, { sku: e.target.value || null }); }} /></div>
                            <div><Label className="text-xs text-gray-500">Unit Price</Label>
                              <Input type="number" defaultValue={comp.unit_price} className="text-xs h-6"
                                onBlur={e => { const v = Number(e.target.value); if (v !== comp.unit_price) handleUpdateProductFromBOM(comp.component_product_id, { unitPrice: v }); }} /></div>
                            <div><Label className="text-xs text-gray-500">Tax Rate %</Label>
                              <Input type="number" defaultValue={comp.component_tax_rate || comp.tax_rate || 18} className="text-xs h-6"
                                onBlur={e => { handleUpdateProductFromBOM(comp.component_product_id, { taxRate: Number(e.target.value) }); }} /></div>
                            <div><Label className="text-xs text-gray-500">HSN Code</Label>
                              <Input defaultValue={comp.component_hsn || comp.hsn_code || ''} className="text-xs h-6"
                                onBlur={e => { handleUpdateProductFromBOM(comp.component_product_id, { hsnCode: e.target.value || null }); }} /></div>
                            <div><Label className="text-xs text-gray-500">Unit of Measure</Label>
                              <Input defaultValue={comp.unit_of_measure || 'Unit'} className="text-xs h-6"
                                onBlur={e => { handleUpdateProductFromBOM(comp.component_product_id, { unitOfMeasure: e.target.value }); }} /></div>
                          </div>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" defaultChecked={!!comp.is_active}
                              onChange={e => handleUpdateProductFromBOM(comp.component_product_id, { isStandalone: e.target.checked })}
                              className="rounded border-gray-300 h-3 w-3" />
                            <span className="text-xs text-gray-500">Also sell separately in catalog</span>
                          </label>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t bg-gray-50 flex-shrink-0">
              <Button className="w-full" onClick={() => setManageBOM(null)}>Done</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
