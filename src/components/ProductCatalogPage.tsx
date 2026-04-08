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
      const params: any = { page: String(page), pageSize: '25' };
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

  const handleCreate = async () => {
    if (!form.name || !form.categoryId) { setError('Name and category required'); return; }
    setError(null);
    const res = await productCatalogApi.create({
      ...form, categoryId: Number(form.categoryId),
      productLineId: form.productLineId ? Number(form.productLineId) : null,
      unitPrice: Number(form.unitPrice) || 0, taxRate: Number(form.taxRate) || 18,
    });
    if (res.success) {
      setShowCreate(false);
      setForm({ sku: '', name: '', description: '', categoryId: '', productLineId: '',
        subCategory: 'Hardware', unitPrice: '', currency: 'INR', unitOfMeasure: 'Unit',
        taxRate: '18', hsnCode: '', isStandalone: true, isBundle: false });
      fetchProducts();
    } else { setError(res.error || 'Failed to create'); }
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
            <h3 className="font-medium text-sm">New Product</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
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
          <Button className="mt-3" onClick={handleCreate}><Plus className="w-3 h-3 mr-1" />Create Product</Button>
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
                          {p.is_bundle && (
                            <button onClick={() => toggleBOM(p.id)} className="text-gray-400 hover:text-gray-600">
                              {expandedBOM.has(p.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                          {p.name}
                          {p.is_bundle && <Badge className="text-[10px] bg-purple-100 text-purple-700">Bundle</Badge>}
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
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
    </div>
  );
}
