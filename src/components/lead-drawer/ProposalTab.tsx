import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Loader2, Plus, FileText, ChevronDown, ChevronRight, Send, CheckCircle2,
  XCircle, Clock, Shield, Download, Trash2, Package, Search
} from 'lucide-react';
import { proposalApi, productCatalogApi } from '../../lib/api';
import { useSettings } from '../../hooks/useSettings';
import { ProposalEditor } from './ProposalEditor';

interface ProposalTabProps {
  leadId: number;
  lead?: any;
  userRole?: string;
}

export function ProposalTab({ leadId, lead, userRole }: ProposalTabProps) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editorMode, setEditorMode] = useState<{ open: boolean; proposalId?: number }>({ open: false });
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) try { setCurrentUser(JSON.parse(stored)); } catch {}
  }, []);

  const isManager = (() => {
    const role = (userRole || currentUser?.role || '').toLowerCase();
    return ['admin', 'manager', 'superadmin'].includes(role);
  })();
  const [templates, setTemplates] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatCurrency } = useSettings();

  const [createForm, setCreateForm] = useState({
    title: '', description: '', proposalType: 'Software' as string,
    templateId: '', coverLetter: '', executiveSummary: '', scopeOfWork: '',
    termsConditions: '', paymentTerms: '', warrantyTerms: '', validityPeriodDays: '30',
  });

  useEffect(() => { fetchProposals(); }, [leadId]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await proposalApi.getByLead(leadId);
      if (res.success) setProposals(res.data || []);
    } catch (err) {
      console.error('Error fetching proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    const res = await proposalApi.getTemplates();
    if (res.success) setTemplates(res.data || []);
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) return;
    const res = await productCatalogApi.getAll({ search: query, pageSize: '20' });
    if (res.success) setProducts(res.data?.data || []);
  };

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t: any) => t.id === Number(templateId));
    if (tpl) {
      setCreateForm(prev => ({
        ...prev, templateId,
        coverLetter: tpl.default_cover_letter || '',
        executiveSummary: tpl.default_executive_summary || '',
        scopeOfWork: tpl.default_scope || '',
        termsConditions: tpl.default_terms_conditions || '',
        paymentTerms: tpl.default_payment_terms || '',
        warrantyTerms: tpl.default_warranty || '',
        validityPeriodDays: String(tpl.validity_days || 30),
      }));
    }
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError(null);
    try {
      const res = await proposalApi.create({
        tenderId: leadId, title: createForm.title, description: createForm.description,
        proposalType: createForm.proposalType,
        templateId: createForm.templateId ? Number(createForm.templateId) : null,
        coverLetter: createForm.coverLetter, executiveSummary: createForm.executiveSummary,
        scopeOfWork: createForm.scopeOfWork, termsConditions: createForm.termsConditions,
        paymentTerms: createForm.paymentTerms, warrantyTerms: createForm.warrantyTerms,
        validityPeriodDays: Number(createForm.validityPeriodDays),
      });
      if (res.success) {
        setShowCreate(false);
        setCreateForm({ title: '', description: '', proposalType: 'Software', templateId: '',
          coverLetter: '', executiveSummary: '', scopeOfWork: '', termsConditions: '',
          paymentTerms: '', warrantyTerms: '', validityPeriodDays: '30' });
        await fetchProposals();
        // Open the newly created proposal
        if (res.data?.id) {
          const detail = await proposalApi.getById(res.data.id);
          if (detail.success) setSelectedProposal(detail.data);
        }
      } else { setError(res.error || 'Failed to create proposal'); }
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleAddProduct = async (product: any) => {
    if (!selectedProposal) return;
    try {
      let res;
      if (product.is_bundle) {
        res = await proposalApi.addBundleToProposal(selectedProposal.id, product.id, 1);
      } else {
        res = await proposalApi.addLineItem(selectedProposal.id, {
          productId: product.id, itemName: product.name, itemDescription: product.description,
          itemType: product.is_bundle ? 'Bundle' : 'Product', sku: product.sku,
          hsnCode: product.hsn_code, unitOfMeasure: product.unit_of_measure,
          quantity: 1, unitPrice: product.unit_price, taxRate: product.tax_rate,
        });
      }
      if (!res?.success) {
        setError(res?.error || 'Failed to add product to proposal');
        return;
      }
      // Refresh proposal
      const detail = await proposalApi.getById(selectedProposal.id);
      if (detail.success) setSelectedProposal(detail.data);
      setShowProductPicker(false);
      setProductSearch('');
    } catch (err: any) { setError(err.message || 'Error adding product'); }
  };

  const handleAddCustomItem = async () => {
    if (!selectedProposal) return;
    await proposalApi.addLineItem(selectedProposal.id, {
      itemName: 'Custom Item', itemType: 'Custom', quantity: 1, unitPrice: 0, taxRate: 18,
    });
    const detail = await proposalApi.getById(selectedProposal.id);
    if (detail.success) setSelectedProposal(detail.data);
  };

  const handleRemoveLineItem = async (itemId: number) => {
    if (!selectedProposal) return;
    await proposalApi.removeLineItem(selectedProposal.id, itemId);
    const detail = await proposalApi.getById(selectedProposal.id);
    if (detail.success) setSelectedProposal(detail.data);
  };

  const handleWorkflow = async (action: string, data?: any) => {
    if (!selectedProposal) return;
    try {
      let res;
      switch (action) {
        case 'submit': res = await proposalApi.submitForApproval(selectedProposal.id); break;
        case 'approve': res = await proposalApi.approve(selectedProposal.id); break;
        case 'reject': res = await proposalApi.reject(selectedProposal.id, data?.reason || ''); break;
        case 'markSubmitted': res = await proposalApi.markSubmitted(selectedProposal.id, data); break;
        case 'accepted': res = await proposalApi.updateOutcome(selectedProposal.id, 'Accepted'); break;
        case 'rejected': res = await proposalApi.updateOutcome(selectedProposal.id, 'Rejected'); break;
      }
      if (res?.success) {
        await fetchProposals();
        const detail = await proposalApi.getById(selectedProposal.id);
        if (detail.success) setSelectedProposal(detail.data);
      } else { alert(res?.error || 'Action failed'); }
    } catch (err: any) { alert(err.message); }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700';
      case 'Pending Approval': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-blue-100 text-blue-800';
      case 'Submitted': return 'bg-indigo-100 text-indigo-800';
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // ==================== EDITOR VIEW ====================
  if (editorMode.open) {
    return (
      <ProposalEditor
        leadId={leadId}
        lead={lead}
        proposalId={editorMode.proposalId}
        onBack={() => setEditorMode({ open: false })}
        onSaved={() => { setEditorMode({ open: false }); fetchProposals(); }}
      />
    );
  }

  // ==================== DETAIL VIEW ====================
  if (selectedProposal) {
    const items = selectedProposal.lineItems || [];
    const topLevel = items.filter((i: any) => !i.parent_line_item_id);

    return (
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelectedProposal(null)}>← Back to Proposals</Button>
          <Badge className={statusColor(selectedProposal.status)}>{selectedProposal.status}</Badge>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-lg">{selectedProposal.title}</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Type:</span> {selectedProposal.proposal_type}</div>
            <div><span className="text-gray-500">Valid Until:</span> {selectedProposal.valid_until || 'N/A'}</div>
            <div><span className="text-gray-500">Created:</span> {selectedProposal.created_by_name}</div>
          </div>
          {selectedProposal.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
              <strong>Rejection Reason:</strong> {selectedProposal.rejection_reason}
            </div>
          )}
        </div>

        {/* Workflow Actions */}
        <div className="flex gap-2 flex-wrap">
          {selectedProposal.status === 'Draft' && (
            <Button size="sm" onClick={() => handleWorkflow('submit')}><Send className="w-3 h-3 mr-1" />Submit for Approval</Button>
          )}
          {selectedProposal.status === 'Pending Approval' && isManager && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleWorkflow('approve')}><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>
              <Button size="sm" variant="destructive" onClick={() => { const reason = prompt('Rejection reason:'); if (reason) handleWorkflow('reject', { reason }); }}><XCircle className="w-3 h-3 mr-1" />Reject</Button>
            </>
          )}
          {selectedProposal.status === 'Approved' && (
            <Button size="sm" onClick={() => { const to = prompt('Submitted to (client name):'); if (to) handleWorkflow('markSubmitted', { submittedTo: to }); }}><Send className="w-3 h-3 mr-1" />Mark as Submitted</Button>
          )}
          {selectedProposal.status === 'Submitted' && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleWorkflow('accepted')}><CheckCircle2 className="w-3 h-3 mr-1" />Client Accepted</Button>
              <Button size="sm" variant="destructive" onClick={() => handleWorkflow('rejected')}><XCircle className="w-3 h-3 mr-1" />Client Rejected</Button>
            </>
          )}
          {selectedProposal.status !== 'Accepted' && (
            <Button size="sm" variant="outline" onClick={() => proposalApi.generatePDF(selectedProposal.id)}><Download className="w-3 h-3 mr-1" />Download PDF</Button>
          )}
        </div>

        {/* Line Items */}
        <div className="border rounded-lg">
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
            <h4 className="font-medium text-sm">Line Items</h4>
            {selectedProposal.status === 'Draft' && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { fetchTemplates(); setShowProductPicker(true); }}><Package className="w-3 h-3 mr-1" />Add from Catalog</Button>
                <Button size="sm" variant="outline" onClick={handleAddCustomItem}><Plus className="w-3 h-3 mr-1" />Custom Item</Button>
              </div>
            )}
          </div>

          {/* Product Picker */}
          {showProductPicker && (
            <div className="p-3 bg-blue-50 border-b space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchProducts(productSearch); }} className="text-sm h-8" />
                <Button size="sm" onClick={() => searchProducts(productSearch)}><Search className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setShowProductPicker(false)}>Cancel</Button>
              </div>
              {products.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {products.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded border text-sm cursor-pointer hover:bg-gray-50"
                      onClick={() => handleAddProduct(p)}>
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {p.sku && <span className="text-gray-400 ml-2">({p.sku})</span>}
                        {p.is_bundle && <Badge className="ml-2 text-[10px] bg-purple-100 text-purple-700">Bundle</Badge>}
                      </div>
                      <span className="font-medium">{formatCurrency(p.unit_price, undefined, { compact: false })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right w-16">Qty</th>
                  <th className="px-3 py-2 text-right w-24">Unit Price</th>
                  <th className="px-3 py-2 text-right w-16">Tax%</th>
                  <th className="px-3 py-2 text-right w-16">Disc%</th>
                  <th className="px-3 py-2 text-right w-28">Total</th>
                  {selectedProposal.status === 'Draft' && <th className="px-3 py-2 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {topLevel.map((item: any) => {
                  const children = items.filter((i: any) => i.parent_line_item_id === item.id);
                  return (
                    <ItemRow key={item.id} item={item} children={children} isDraft={selectedProposal.status === 'Draft'}
                      onRemove={handleRemoveLineItem} formatCurrency={formatCurrency} />
                  );
                })}
                {topLevel.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">No line items yet. Add from catalog or custom.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          {topLevel.length > 0 && (
            <div className="p-3 bg-gray-50 border-t space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selectedProposal.subtotal, undefined, { compact: false })}</span></div>
              <div className="flex justify-between text-gray-500"><span>Tax</span><span>+{formatCurrency(selectedProposal.total_tax, undefined, { compact: false })}</span></div>
              {selectedProposal.total_discount > 0 && (
                <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(selectedProposal.total_discount, undefined, { compact: false })}</span></div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Grand Total</span><span>{formatCurrency(selectedProposal.grand_total, undefined, { compact: false })}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sections */}
        {['cover_letter', 'executive_summary', 'scope_of_work', 'terms_conditions', 'payment_terms', 'warranty_terms'].map(section => {
          const label = section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const value = selectedProposal[section];
          if (!value) return null;
          return (
            <details key={section} className="border rounded-lg">
              <summary className="p-3 cursor-pointer text-sm font-medium bg-gray-50 hover:bg-gray-100">{label}</summary>
              <div className="p-3 text-sm whitespace-pre-wrap">{value}</div>
            </details>
          );
        })}
      </div>
    );
  }

  // ==================== CREATE FORM ====================
  if (showCreate) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Create New Proposal</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Title *</Label>
              <Input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} placeholder="Proposal title" className="text-sm" /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={createForm.proposalType} onValueChange={v => setCreateForm({ ...createForm, proposalType: v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Software', 'Hardware', 'Custom Development', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select></div>
          </div>
          <div><Label className="text-xs">Template (Optional)</Label>
            <Select value={createForm.templateId} onValueChange={v => { setCreateForm({ ...createForm, templateId: v }); handleTemplateSelect(v); }}
              onOpenChange={open => { if (open) fetchTemplates(); }}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select a template..." /></SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div><Label className="text-xs">Description</Label>
            <Textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} className="text-sm" rows={2} /></div>
          <div><Label className="text-xs">Cover Letter</Label>
            <Textarea value={createForm.coverLetter} onChange={e => setCreateForm({ ...createForm, coverLetter: e.target.value })} className="text-sm" rows={3} /></div>
          <div><Label className="text-xs">Executive Summary</Label>
            <Textarea value={createForm.executiveSummary} onChange={e => setCreateForm({ ...createForm, executiveSummary: e.target.value })} className="text-sm" rows={3} /></div>
          <div><Label className="text-xs">Scope of Work</Label>
            <Textarea value={createForm.scopeOfWork} onChange={e => setCreateForm({ ...createForm, scopeOfWork: e.target.value })} className="text-sm" rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Terms & Conditions</Label>
              <Textarea value={createForm.termsConditions} onChange={e => setCreateForm({ ...createForm, termsConditions: e.target.value })} className="text-sm" rows={3} /></div>
            <div><Label className="text-xs">Payment Terms</Label>
              <Textarea value={createForm.paymentTerms} onChange={e => setCreateForm({ ...createForm, paymentTerms: e.target.value })} className="text-sm" rows={3} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Warranty Terms</Label>
              <Textarea value={createForm.warrantyTerms} onChange={e => setCreateForm({ ...createForm, warrantyTerms: e.target.value })} className="text-sm" rows={2} /></div>
            <div><Label className="text-xs">Validity (days)</Label>
              <Input type="number" value={createForm.validityPeriodDays} onChange={e => setCreateForm({ ...createForm, validityPeriodDays: e.target.value })} className="text-sm" /></div>
          </div>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
            Create Proposal
          </Button>
        </div>
      </div>
    );
  }

  // ==================== LIST VIEW ====================
  const pendingApprovals = proposals.filter(p => p.status === 'Pending Approval');

  return (
    <div className="p-4 space-y-4">
      {/* Pending Approvals Banner (visible to managers) */}
      {isManager && pendingApprovals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">{pendingApprovals.length}</span>
            </div>
            <span className="text-sm font-semibold text-amber-800">Pending Your Approval</span>
          </div>
          <div className="space-y-1.5">
            {pendingApprovals.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded p-2 border border-amber-100 cursor-pointer hover:bg-amber-50"
                onClick={async () => { const detail = await proposalApi.getById(p.id); if (detail.success) setSelectedProposal(detail.data); }}>
                <div>
                  <span className="text-xs font-medium">{p.title}</span>
                  <span className="text-[10px] text-gray-500 ml-2">by {p.created_by_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{formatCurrency(p.grand_total, undefined, { compact: false })}</span>
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">Review</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-gray-700">{proposals.length} Proposal{proposals.length !== 1 ? 's' : ''}</h3>
        <Button size="sm" onClick={() => setEditorMode({ open: true })}><Plus className="w-3 h-3 mr-1" />New Proposal</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No proposals yet. Create your first proposal to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {proposals.map((p: any) => (
            <div key={p.id} className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={async () => { const detail = await proposalApi.getById(p.id); if (detail.success) setSelectedProposal(detail.data); }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{p.title}</span>
                    <Badge className={`text-[10px] ${statusColor(p.status)}`}>{p.status}</Badge>
                    <Badge variant="outline" className="text-[10px]">{p.proposal_type}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    v{p.current_version} · Created by {p.created_by_name} · {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="font-semibold text-sm">{formatCurrency(p.grand_total, undefined, { compact: false })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Line Item Row Component ====================
function ItemRow({ item, children, isDraft, onRemove, formatCurrency }: {
  item: any; children: any[]; isDraft: boolean; onRemove: (id: number) => void; formatCurrency: any;
}) {
  const [expanded, setExpanded] = useState(item.item_type === 'Bundle');

  return (
    <>
      <tr className={`border-b ${item.item_type === 'Bundle' ? 'bg-purple-50/50' : ''}`}>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {children.length > 0 && (
              <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            )}
            <div>
              <span className="font-medium">{item.item_name}</span>
              {item.sku && <span className="text-gray-400 text-xs ml-1">({item.sku})</span>}
              {item.item_type === 'Bundle' && <Badge className="ml-1 text-[9px] bg-purple-100 text-purple-700">Bundle</Badge>}
              {item.item_type === 'Custom' && <Badge className="ml-1 text-[9px] bg-gray-100 text-gray-600">Custom</Badge>}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 text-right">{item.quantity}</td>
        <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price, undefined, { compact: false })}</td>
        <td className="px-3 py-2 text-right">{item.tax_rate}%</td>
        <td className="px-3 py-2 text-right">{item.discount_percent}%</td>
        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.line_total, undefined, { compact: false })}</td>
        {isDraft && <td className="px-3 py-2"><button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button></td>}
      </tr>
      {expanded && children.map((child: any) => (
        <tr key={child.id} className="border-b bg-gray-50/50">
          <td className="px-3 py-1.5 pl-10 text-xs text-gray-600">↳ {child.item_name}</td>
          <td className="px-3 py-1.5 text-right text-xs">{child.quantity}</td>
          <td className="px-3 py-1.5 text-right text-xs">{formatCurrency(child.unit_price, undefined, { compact: false })}</td>
          <td className="px-3 py-1.5 text-right text-xs">{child.tax_rate}%</td>
          <td className="px-3 py-1.5 text-right text-xs">{child.discount_percent}%</td>
          <td className="px-3 py-1.5 text-right text-xs">{formatCurrency(child.line_total, undefined, { compact: false })}</td>
          {isDraft && <td className="px-3 py-1.5"></td>}
        </tr>
      ))}
    </>
  );
}
