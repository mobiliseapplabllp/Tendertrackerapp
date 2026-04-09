import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ProposalPreview } from './ProposalPreview';
import { proposalApi, productCatalogApi, authApi } from '../../lib/api';
import { useBranding } from '../../hooks/useBranding';
import { useSettings } from '../../hooks/useSettings';
import {
  Loader2, Sparkles, Save, ArrowLeft, Plus, Trash2, Search,
  ChevronDown, ChevronRight, Package, RefreshCw, Eye, CheckCircle2, XCircle
} from 'lucide-react';

interface ProposalEditorProps {
  leadId: number;
  lead: any;
  proposalId?: number;
  approvalMode?: boolean; // true when manager is reviewing for approval
  onBack: () => void;
  onSaved: () => void;
}

export function ProposalEditor({ leadId, lead, proposalId, approvalMode, onBack, onSaved }: ProposalEditorProps) {
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refiningSection, setRefiningSection] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { appName } = useBranding();
  const { settings } = useSettings();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    authApi.getCurrentUser().then(res => { if (res.success && res.data) setCurrentUser(res.data); });
  }, []);

  // Proposal data
  const [form, setForm] = useState({
    title: '', proposalType: 'Software' as string, version: '01',
    date: new Date().toISOString().split('T')[0],
    proposalId: '',
    clientName: '', clientCompany: '', clientAddress: '',
    submitterName: '', submitterEmail: '', submitterPhone: '',
    companyName: '', companyEmail: '', companyPhone: '',
    coverLetter: '', executiveSummary: '', scopeOfWork: '',
    notes: '', termsConditions: '', paymentTerms: '', warrantyTerms: '',
    validityPeriodDays: 30,
  });

  // Line items
  const [oneTimeItems, setOneTimeItems] = useState<any[]>([]);
  const [recurringItems, setRecurringItems] = useState<any[]>([]);
  const [showProductPicker, setShowProductPicker] = useState<'one-time' | 'recurring' | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Collapsed sections
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Auto-fill submitter from logged-in user
  useEffect(() => {
    if (currentUser) {
      setForm(prev => ({
        ...prev,
        submitterName: prev.submitterName || currentUser.fullName || currentUser.full_name || '',
        submitterEmail: prev.submitterEmail || currentUser.email || '',
        submitterPhone: prev.submitterPhone || currentUser.phone || '',
      }));
    }
  }, [currentUser]);

  // Auto-fill company from settings
  useEffect(() => {
    if (settings) {
      setForm(prev => ({
        ...prev,
        companyName: prev.companyName || settings.companyName || appName || 'Mobilise App Lab Limited',
        companyEmail: prev.companyEmail || settings.companyEmail || '',
        companyPhone: prev.companyPhone || settings.company_phone || '',
      }));
    }
  }, [settings, appName]);

  useEffect(() => {
    // Pre-fill from lead
    if (lead) {
      setForm(prev => ({
        ...prev,
        title: `Proposal for ${lead.title || ''}`,
        clientName: lead.client || '',
        clientCompany: lead.company?.companyName || lead.client || '',
        clientAddress: lead.company?.address ? `${lead.company.address}, ${lead.company.city || ''}, ${lead.company.state || ''}` : '',
        proposalId: `${new Date().getFullYear()}/MAL/${String(leadId).padStart(5, '0')}`,
      }));
    }
    // Load existing proposal if editing
    if (proposalId) loadProposal(proposalId);
  }, [leadId, proposalId]);

  const loadProposal = async (id: number) => {
    const res = await proposalApi.getById(id);
    if (res.success && res.data) {
      const p = res.data;
      setForm({
        title: p.title || '', proposalType: p.proposal_type || 'Software',
        version: String(p.current_version || '01'),
        date: p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        proposalId: `${new Date(p.created_at).getFullYear()}/MAL/${String(p.tender_id).padStart(5, '0')}`,
        clientName: p.submitted_to || '', clientCompany: '', clientAddress: '',
        coverLetter: p.cover_letter || '', executiveSummary: p.executive_summary || '',
        scopeOfWork: p.scope_of_work || '', notes: '', termsConditions: p.terms_conditions || '',
        paymentTerms: p.payment_terms || '', warrantyTerms: p.warranty_terms || '',
        validityPeriodDays: p.validity_period_days || 30,
      });
      // Split line items by charge_type
      const items = p.lineItems || [];
      setOneTimeItems(items.filter((i: any) => i.charge_type !== 'recurring').map((i: any) => ({
        id: i.id, name: i.item_name, quantity: i.quantity, unitPrice: i.unit_price, productId: i.product_id
      })));
      setRecurringItems(items.filter((i: any) => i.charge_type === 'recurring').map((i: any) => ({
        id: i.id, name: i.item_name, quantity: i.quantity, unitPrice: i.unit_price, productId: i.product_id
      })));
    }
  };

  const handleAIGenerate = async () => {
    setGenerating(true); setError(null);
    try {
      const res = await proposalApi.aiGenerate(leadId);
      if (res.success && res.data) {
        const d = res.data;
        setForm(prev => ({
          ...prev,
          title: d.title || prev.title,
          proposalType: d.proposalType || prev.proposalType,
          coverLetter: d.coverLetter || '', executiveSummary: d.executiveSummary || '',
          scopeOfWork: d.scopeOfWork || '', notes: d.notes || '',
          termsConditions: d.termsConditions || '', paymentTerms: d.paymentTerms || '',
          warrantyTerms: d.warrantyTerms || '', validityPeriodDays: d.validityPeriodDays || 30,
          proposalId: d.metadata?.proposalId || prev.proposalId,
          clientName: d.metadata?.clientName || prev.clientName,
          clientAddress: d.metadata?.companyAddress || prev.clientAddress,
        }));
        // Add suggested items as one-time
        if (d.suggestedItems?.length) {
          setOneTimeItems(d.suggestedItems.map((i: any) => ({
            name: i.name, quantity: 1, unitPrice: i.unitPrice, productId: i.productId
          })));
        }
      } else { setError(res.error || 'AI generation failed'); }
    } catch (err: any) { setError(err.message); }
    finally { setGenerating(false); }
  };

  const handleAIRefine = async (section: string) => {
    setRefiningSection(section);
    try {
      const currentText = (form as any)[section] || '';
      const res = await proposalApi.aiRefine(section, currentText, {
        clientName: form.clientName, leadTitle: lead?.title, productLineName: lead?.productLine?.name
      });
      if (res.success && res.data?.refined) {
        setForm(prev => ({ ...prev, [section]: res.data.refined }));
      }
    } catch (err: any) { console.error(err); }
    finally { setRefiningSection(null); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError(null);
    try {
      let savedId = proposalId;
      if (!savedId) {
        // Create new
        const res = await proposalApi.create({
          tenderId: leadId, title: form.title, proposalType: form.proposalType,
          coverLetter: form.coverLetter, executiveSummary: form.executiveSummary,
          scopeOfWork: form.scopeOfWork, termsConditions: form.termsConditions,
          paymentTerms: form.paymentTerms, warrantyTerms: form.warrantyTerms,
          validityPeriodDays: form.validityPeriodDays,
        });
        if (!res.success) { setError(res.error || 'Failed to save'); return; }
        savedId = res.data?.id;
      } else {
        // Update existing
        await proposalApi.update(savedId, {
          title: form.title, proposalType: form.proposalType,
          coverLetter: form.coverLetter, executiveSummary: form.executiveSummary,
          scopeOfWork: form.scopeOfWork, termsConditions: form.termsConditions,
          paymentTerms: form.paymentTerms, warrantyTerms: form.warrantyTerms,
          validityPeriodDays: form.validityPeriodDays,
        });
      }
      // Save line items
      if (savedId) {
        for (const item of oneTimeItems) {
          if (!item.id) {
            await proposalApi.addLineItem(savedId, {
              itemName: item.name, quantity: item.quantity, unitPrice: item.unitPrice,
              productId: item.productId || null, itemType: 'Product', chargeType: 'one-time', taxRate: 18,
            });
          }
        }
        for (const item of recurringItems) {
          if (!item.id) {
            await proposalApi.addLineItem(savedId, {
              itemName: item.name, quantity: item.quantity, unitPrice: item.unitPrice,
              productId: item.productId || null, itemType: 'Service', chargeType: 'recurring', taxRate: 18,
            });
          }
        }
      }
      onSaved();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const searchProducts = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    // Search ALL products (including non-standalone BOM components)
    const res = await productCatalogApi.getAll({ search: query, pageSize: '20' });
    if (res.success) setSearchResults(res.data?.data || []);
  };

  const [expandingBundle, setExpandingBundle] = useState<any>(null);
  const [bundleBOM, setBundleBOM] = useState<any[]>([]);

  const handleExpandBundle = async (product: any) => {
    setExpandingBundle(product);
    const res = await productCatalogApi.getBOM(product.id);
    if (res.success) setBundleBOM(res.data || []);
  };

  const addItem = (product: any, type: 'one-time' | 'recurring') => {
    const item = { name: product.name || product.component_name, quantity: 1, unitPrice: product.unit_price, productId: product.id || product.component_product_id, isBundle: !!product.is_bundle };
    if (type === 'one-time') setOneTimeItems(prev => [...prev, item]);
    else setRecurringItems(prev => [...prev, item]);
    setShowProductPicker(null); setProductSearch(''); setSearchResults([]);
    setExpandingBundle(null); setBundleBOM([]);
  };

  const addBOMComponent = (comp: any, type: 'one-time' | 'recurring') => {
    const item = { name: comp.component_name, quantity: comp.quantity || 1, unitPrice: comp.unit_price, productId: comp.component_product_id };
    if (type === 'one-time') setOneTimeItems(prev => [...prev, item]);
    else setRecurringItems(prev => [...prev, item]);
  };

  const addAllBOMComponents = (type: 'one-time' | 'recurring') => {
    const items = bundleBOM.map(comp => ({
      name: comp.component_name, quantity: comp.quantity || 1, unitPrice: comp.unit_price, productId: comp.component_product_id
    }));
    if (type === 'one-time') setOneTimeItems(prev => [...prev, ...items]);
    else setRecurringItems(prev => [...prev, ...items]);
    setExpandingBundle(null); setBundleBOM([]);
    setShowProductPicker(null);
  };

  const addCustomItem = (type: 'one-time' | 'recurring') => {
    const item = { name: 'Custom Item', quantity: 1, unitPrice: 0 };
    if (type === 'one-time') setOneTimeItems(prev => [...prev, item]);
    else setRecurringItems(prev => [...prev, item]);
  };

  const toggleSection = (name: string) => {
    const next = new Set(collapsed);
    next.has(name) ? next.delete(name) : next.add(name);
    setCollapsed(next);
  };

  const SectionHeader = ({ name, label, showAI = true }: { name: string; label: string; showAI?: boolean }) => (
    <div className="flex items-center justify-between cursor-pointer py-2 border-b border-gray-100"
      onClick={() => toggleSection(name)}>
      <div className="flex items-center gap-1.5">
        {collapsed.has(name) ? <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
        <span className="text-xs font-semibold text-gray-700 uppercase">{label}</span>
      </div>
      {showAI && !collapsed.has(name) && (
        <Button size="sm" variant="ghost" className="h-5 text-xs px-1.5 text-indigo-600"
          onClick={e => { e.stopPropagation(); handleAIRefine(name); }}
          disabled={refiningSection === name}>
          {refiningSection === name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          <span className="ml-0.5">AI</span>
        </Button>
      )}
    </div>
  );

  const handleApproveAsIs = async () => {
    if (!proposalId) return;
    setSaving(true);
    try {
      const res = await proposalApi.approve(proposalId);
      if (res.success) { onSaved(); } else { setError(res.error || 'Failed to approve'); }
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleApproveWithChanges = async () => {
    if (!proposalId) return;
    const changeNote = prompt('Describe your changes (optional):') || 'Approved with modifications';
    setSaving(true);
    try {
      const res = await proposalApi.approveWithChanges(proposalId, {
        title: form.title, coverLetter: form.coverLetter, executiveSummary: form.executiveSummary,
        scopeOfWork: form.scopeOfWork, termsConditions: form.termsConditions,
        paymentTerms: form.paymentTerms, warrantyTerms: form.warrantyTerms, changeNote,
      });
      if (res.success) { onSaved(); } else { setError(res.error || 'Failed to approve'); }
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!proposalId) return;
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setSaving(true);
    try {
      const res = await proposalApi.reject(proposalId, reason);
      if (res.success) { onSaved(); } else { setError(res.error || 'Failed to reject'); }
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  // Fetch BOM for bundle items in proposal (for annexure)
  const [annexureBOM, setAnnexureBOM] = useState<Record<number, any[]>>({});
  useEffect(() => {
    const bundleItems = [...oneTimeItems, ...recurringItems].filter(i => i.isBundle && i.productId);
    bundleItems.forEach(async (item) => {
      if (!annexureBOM[item.productId]) {
        const res = await productCatalogApi.getBOM(item.productId);
        if (res.success) setAnnexureBOM(prev => ({ ...prev, [item.productId]: res.data || [] }));
      }
    });
  }, [oneTimeItems, recurringItems]);

  // Preview data
  const previewData = {
    ...form,
    oneTimeItems: oneTimeItems,
    recurringItems: recurringItems,
    validityDays: form.validityPeriodDays,
    submitterName: form.submitterName,
    submitterEmail: form.submitterEmail,
    submitterPhone: form.submitterPhone,
    companyName: form.companyName,
    companyEmail: form.companyEmail,
    companyPhone: form.companyPhone,
    annexureBOM: annexureBOM,
    annexureNotes: (form as any).annexureNotes,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Full Screen Preview Modal */}
      {fullScreenPreview && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[60]" onClick={() => setFullScreenPreview(false)} />
          <div className="fixed inset-4 z-[61] bg-gray-100 rounded-xl overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b">
              <h2 className="font-semibold">Proposal Preview — {form.title || 'Untitled'}</h2>
              <div className="flex items-center gap-2">
                {proposalId && (
                  <Button size="sm" variant="outline" onClick={() => proposalApi.generatePDF(proposalId)}>
                    <Save className="w-3.5 h-3.5 mr-1" />Download PDF
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  Print
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFullScreenPreview(false)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 flex justify-center">
              <div className="w-full max-w-3xl">
                <ProposalPreview data={{
                  ...previewData,
                  annexureNotes: (form as any).annexureNotes,
                }} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-3.5 h-3.5 mr-1" />Back</Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleAIGenerate} disabled={generating}>
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            AI Generate All
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-3.5 h-3.5 mr-1" />{showPreview ? 'Hide' : 'Show'} Preview
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFullScreenPreview(true)}>
            Full Screen
          </Button>
          {proposalId && (
            <Button size="sm" variant="outline" onClick={() => proposalApi.generatePDF(proposalId)}>
              <Save className="w-3.5 h-3.5 mr-1" />PDF
            </Button>
          )}
          {approvalMode ? (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleApproveAsIs} disabled={saving}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve As-Is
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleApproveWithChanges} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Approve with Changes
              </Button>
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={saving}>
                <XCircle className="w-3.5 h-3.5 mr-1" />Reject
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save Draft
            </Button>
          )}
        </div>
      </div>

      {error && <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>}

      {/* Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} overflow-y-auto p-4 space-y-3 border-r`}>

          {/* Header */}
          <SectionHeader name="header" label="Header & Client" showAI={false} />
          {!collapsed.has('header') && (
            <div className="space-y-2 pl-5">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Title *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="text-xs h-7" /></div>
                <div><Label className="text-xs">Type</Label>
                  <Select value={form.proposalType} onValueChange={v => setForm({ ...form, proposalType: v })}>
                    <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                    <SelectContent>{['Software', 'Hardware', 'Custom Development', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label className="text-xs">Client Name</Label>
                  <Input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} className="text-xs h-7" /></div>
                <div><Label className="text-xs">Company</Label>
                  <Input value={form.clientCompany} onChange={e => setForm({ ...form, clientCompany: e.target.value })} className="text-xs h-7" /></div>
              </div>
              <div><Label className="text-xs">Client Address</Label>
                <Input value={form.clientAddress} onChange={e => setForm({ ...form, clientAddress: e.target.value })} className="text-xs h-7" /></div>
            </div>
          )}

          {/* Submitted By */}
          <SectionHeader name="submitter" label="Submitted By" showAI={false} />
          {!collapsed.has('submitter') && (
            <div className="space-y-2 pl-5">
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Name</Label>
                  <Input value={form.submitterName} onChange={e => setForm({ ...form, submitterName: e.target.value })} className="text-xs h-7" /></div>
                <div><Label className="text-xs">Email</Label>
                  <Input value={form.submitterEmail} onChange={e => setForm({ ...form, submitterEmail: e.target.value })} className="text-xs h-7" /></div>
                <div><Label className="text-xs">Phone</Label>
                  <Input value={form.submitterPhone} onChange={e => setForm({ ...form, submitterPhone: e.target.value })} className="text-xs h-7" /></div>
              </div>
              <div className="border-t pt-2 mt-1">
                <p className="text-xs text-gray-500 mb-1">Company Details</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Company Name</Label>
                    <Input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} className="text-xs h-7" /></div>
                  <div><Label className="text-xs">Company Email</Label>
                    <Input value={form.companyEmail} onChange={e => setForm({ ...form, companyEmail: e.target.value })} className="text-xs h-7" /></div>
                  <div><Label className="text-xs">Company Phone</Label>
                    <Input value={form.companyPhone} onChange={e => setForm({ ...form, companyPhone: e.target.value })} className="text-xs h-7" /></div>
                </div>
              </div>
            </div>
          )}

          {/* Cover Letter */}
          <SectionHeader name="coverLetter" label="Cover Letter" />
          {!collapsed.has('coverLetter') && (
            <div className="pl-5">
              <Textarea value={form.coverLetter} onChange={e => setForm({ ...form, coverLetter: e.target.value })}
                className="text-xs min-h-[80px]" placeholder="Dear Sir/Madam, ..." />
            </div>
          )}

          {/* Executive Summary */}
          <SectionHeader name="executiveSummary" label="Executive Summary" />
          {!collapsed.has('executiveSummary') && (
            <div className="pl-5">
              <Textarea value={form.executiveSummary} onChange={e => setForm({ ...form, executiveSummary: e.target.value })}
                className="text-xs min-h-[60px]" placeholder="Project overview..." />
            </div>
          )}

          {/* Scope of Work */}
          <SectionHeader name="scopeOfWork" label="Scope of Work" />
          {!collapsed.has('scopeOfWork') && (
            <div className="pl-5">
              <Textarea value={form.scopeOfWork} onChange={e => setForm({ ...form, scopeOfWork: e.target.value })}
                className="text-xs min-h-[80px]" placeholder="Scope details..." />
            </div>
          )}

          {/* One-Time Line Items */}
          <SectionHeader name="oneTime" label="[A] One-Time Charges" showAI={false} />
          {!collapsed.has('oneTime') && (
            <div className="pl-5 space-y-2">
              {oneTimeItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                  <Input value={item.name} onChange={e => { const n = [...oneTimeItems]; n[i].name = e.target.value; setOneTimeItems(n); }}
                    className="text-xs h-6 flex-1" />
                  <Input type="number" value={item.quantity} onChange={e => { const n = [...oneTimeItems]; n[i].quantity = Number(e.target.value); setOneTimeItems(n); }}
                    className="text-xs h-6 w-14" placeholder="Qty" />
                  <Input type="number" value={item.unitPrice} onChange={e => { const n = [...oneTimeItems]; n[i].unitPrice = Number(e.target.value); setOneTimeItems(n); }}
                    className="text-xs h-6 w-20" placeholder="Rate" />
                  <span className="text-xs font-medium w-16 text-right">
                    {(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                  </span>
                  <button onClick={() => setOneTimeItems(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3 text-red-400" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setShowProductPicker('one-time')}>
                  <Package className="w-3 h-3 mr-1" />From Catalog
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => addCustomItem('one-time')}>
                  <Plus className="w-3 h-3 mr-1" />Custom
                </Button>
              </div>
              {showProductPicker === 'one-time' && <ProductPicker onSelect={p => addItem(p, 'one-time')} onClose={() => { setShowProductPicker(null); setExpandingBundle(null); setBundleBOM([]); }}
                search={productSearch} setSearch={setProductSearch} results={searchResults} onSearch={searchProducts}
                onExpandBundle={handleExpandBundle} expandingBundle={expandingBundle} bundleBOM={bundleBOM}
                onAddBOMComponent={c => addBOMComponent(c, 'one-time')} onAddAllBOM={() => addAllBOMComponents('one-time')} chargeType="one-time" />}
            </div>
          )}

          {/* Recurring Line Items */}
          <SectionHeader name="recurring" label="[B] Recurring Charges (Annual)" showAI={false} />
          {!collapsed.has('recurring') && (
            <div className="pl-5 space-y-2">
              {recurringItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-50 rounded p-2">
                  <Input value={item.name} onChange={e => { const n = [...recurringItems]; n[i].name = e.target.value; setRecurringItems(n); }}
                    className="text-xs h-6 flex-1" />
                  <Input type="number" value={item.quantity} onChange={e => { const n = [...recurringItems]; n[i].quantity = Number(e.target.value); setRecurringItems(n); }}
                    className="text-xs h-6 w-14" placeholder="Qty" />
                  <Input type="number" value={item.unitPrice} onChange={e => { const n = [...recurringItems]; n[i].unitPrice = Number(e.target.value); setRecurringItems(n); }}
                    className="text-xs h-6 w-20" placeholder="Rate" />
                  <span className="text-xs font-medium w-16 text-right">
                    {(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                  </span>
                  <button onClick={() => setRecurringItems(prev => prev.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3 text-red-400" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setShowProductPicker('recurring')}>
                  <Package className="w-3 h-3 mr-1" />From Catalog
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => addCustomItem('recurring')}>
                  <Plus className="w-3 h-3 mr-1" />Custom
                </Button>
              </div>
              {showProductPicker === 'recurring' && <ProductPicker onSelect={p => addItem(p, 'recurring')} onClose={() => { setShowProductPicker(null); setExpandingBundle(null); setBundleBOM([]); }}
                search={productSearch} setSearch={setProductSearch} results={searchResults} onSearch={searchProducts}
                onExpandBundle={handleExpandBundle} expandingBundle={expandingBundle} bundleBOM={bundleBOM}
                onAddBOMComponent={c => addBOMComponent(c, 'recurring')} onAddAllBOM={() => addAllBOMComponents('recurring')} chargeType="recurring" />}
            </div>
          )}

          {/* Notes */}
          <SectionHeader name="notes" label="Notes" />
          {!collapsed.has('notes') && (
            <div className="pl-5">
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="text-xs min-h-[60px]" placeholder="Additional notes..." />
            </div>
          )}

          {/* T&C */}
          <SectionHeader name="termsConditions" label="Terms & Conditions" />
          {!collapsed.has('termsConditions') && (
            <div className="pl-5">
              <Textarea value={form.termsConditions} onChange={e => setForm({ ...form, termsConditions: e.target.value })}
                className="text-xs min-h-[80px]" placeholder="Terms..." />
            </div>
          )}

          {/* Payment Terms */}
          <SectionHeader name="paymentTerms" label="Payment Terms" />
          {!collapsed.has('paymentTerms') && (
            <div className="pl-5">
              <Textarea value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
                className="text-xs min-h-[60px]" placeholder="Payment terms..." />
            </div>
          )}

          {/* Warranty */}
          <SectionHeader name="warrantyTerms" label="Warranty & Support" />
          {!collapsed.has('warrantyTerms') && (
            <div className="pl-5">
              <Textarea value={form.warrantyTerms} onChange={e => setForm({ ...form, warrantyTerms: e.target.value })}
                className="text-xs min-h-[60px]" placeholder="Warranty terms..." />
            </div>
          )}

          {/* Annexure Notes */}
          <SectionHeader name="annexure" label="Annexure / Additional Notes" showAI={false} />
          {!collapsed.has('annexure') && (
            <div className="pl-5 space-y-2">
              <p className="text-xs text-gray-500">Bundle products added to the proposal will automatically show their BOM breakdown in the Annexure section of the preview. You can also add custom notes below.</p>
              <Textarea value={form.annexureNotes || ''} onChange={e => setForm({ ...form, annexureNotes: e.target.value } as any)}
                className="text-xs min-h-[60px]" placeholder="Additional annexure notes, special instructions, configuration details..." />
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        {showPreview && (
          <div className="w-1/2 overflow-y-auto bg-gray-100 p-4">
            <div className="sticky top-0 bg-gray-100 pb-2 z-10">
              <Badge variant="outline" className="text-xs">Live Preview</Badge>
            </div>
            <ProposalPreview data={previewData} />
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Product Picker Sub-Component ====================
function ProductPicker({ onSelect, onClose, search, setSearch, results, onSearch, onExpandBundle, expandingBundle, bundleBOM, onAddBOMComponent, onAddAllBOM, chargeType }: {
  onSelect: (p: any) => void; onClose: () => void;
  search: string; setSearch: (s: string) => void;
  results: any[]; onSearch: (q: string) => void;
  onExpandBundle?: (p: any) => void; expandingBundle?: any; bundleBOM?: any[];
  onAddBOMComponent?: (c: any) => void; onAddAllBOM?: () => void; chargeType?: string;
}) {
  return (
    <div className="bg-blue-50 rounded-lg p-2 border space-y-1.5">
      <div className="flex gap-1.5">
        <Input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSearch(search); }}
          className="text-xs h-6 flex-1" placeholder="Search products & components..." />
        <Button size="sm" className="h-6 w-6 p-0" onClick={() => onSearch(search)}><Search className="w-3 h-3" /></Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onClose}><Trash2 className="w-3 h-3" /></Button>
      </div>

      {/* Bundle BOM Expansion */}
      {expandingBundle && (bundleBOM || []).length > 0 && (
        <div className="bg-white rounded border p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">{expandingBundle.name} — Components:</span>
            <Button size="sm" className="h-5 text-xs px-1.5" onClick={onAddAllBOM}>Add All Components</Button>
          </div>
          {(bundleBOM || []).map((c: any, i: number) => (
            <div key={i} className="flex items-center justify-between px-2 py-0.5 rounded text-xs hover:bg-indigo-50 cursor-pointer"
              onClick={() => onAddBOMComponent?.(c)}>
              <span>↳ {c.component_name} <span className="text-gray-500">x{c.quantity}</span></span>
              <span className="font-medium">₹{c.unit_price?.toLocaleString('en-IN')}</span>
            </div>
          ))}
          <Button size="sm" variant="ghost" className="h-5 text-xs w-full" onClick={() => { /* clear */ }}>Back to search</Button>
        </div>
      )}

      {/* Search Results */}
      {!expandingBundle && results.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {results.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between bg-white px-2 py-1 rounded text-xs">
              <div className="flex items-center gap-1 flex-1 cursor-pointer hover:text-indigo-600" onClick={() => onSelect(p)}>
                <span>{p.name}</span>
                {p.sku && <span className="text-gray-500">({p.sku})</span>}
                {!!p.is_bundle && <span className="bg-purple-600 text-white px-1 rounded text-xs">Bundle</span>}
                {!p.is_standalone && <span className="bg-gray-200 text-gray-600 px-1 rounded text-xs">Component</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">₹{p.unit_price?.toLocaleString('en-IN')}</span>
                {!!p.is_bundle && p.component_count > 0 && onExpandBundle && (
                  <button onClick={(e) => { e.stopPropagation(); onExpandBundle(p); }}
                    className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded hover:bg-indigo-200" title="View & add individual components">
                    BOM ({p.component_count})
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
