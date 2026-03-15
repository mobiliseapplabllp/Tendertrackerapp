import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import type { Lead, LeadType } from '../lib/types';
import { X, FileText, Save, Upload, Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { documentApi, companyApi, leadTypeApi, productLineApi } from '../lib/api';
import type { Company, ProductLine } from '../lib/types';

interface CreateLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (lead: Partial<Lead>, documents?: File[]) => Promise<void>;
}

export function CreateLeadDialog({
  isOpen,
  onClose,
  onCreate,
}: CreateLeadDialogProps) {
  const [formData, setFormData] = useState({
    leadNumber: '',
    title: '',
    description: '',
    status: 'Draft' as Lead['status'],
    submissionDeadline: '',
    estimatedValue: '',
    dealValue: '',
    probability: '',
    emdAmount: '',
    tenderFees: '',
    companyId: '',
    leadTypeId: '',
    source: '',
    productLineId: '',
    subCategory: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leadTypes, setLeadTypes] = useState<LeadType[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingLeadTypes, setLoadingLeadTypes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch companies and lead types when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      fetchLeadTypes();
      fetchProductLines();
    }
  }, [isOpen]);

  const fetchProductLines = async () => {
    try {
      const response = await productLineApi.getAll();
      if (response.success && response.data) {
        setProductLines(Array.isArray(response.data) ? response.data : response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load product lines:', err.message);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await companyApi.getAll();
      if (response.success && response.data) {
        const companiesData = response.data.data || response.data || [];
        const transformed = companiesData.map((company: any) => ({
          id: company.id,
          companyName: company.company_name || company.companyName,
          industry: company.industry,
          website: company.website,
          phone: company.phone,
          email: company.email,
          address: company.address,
          city: company.city,
          state: company.state,
          country: company.country,
          postalCode: company.postal_code || company.postalCode,
          taxId: company.tax_id || company.taxId,
          status: company.status || 'Active',
          createdAt: company.created_at || company.createdAt,
          updatedAt: company.updated_at || company.updatedAt,
        }));
        setCompanies(transformed);
      }
    } catch (err: any) {
      // Error handled silently
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchLeadTypes = async () => {
    try {
      setLoadingLeadTypes(true);
      const response = await leadTypeApi.getAll();
      if (response.success && response.data) {
        setLeadTypes(response.data);
        // Set default lead type to "Lead"
        const leadType = response.data.find((lt: LeadType) => lt.name === 'Lead');
        if (leadType) {
          setFormData(prev => ({ ...prev, leadTypeId: leadType.id.toString() }));
        }
      }
    } catch (err: any) {
      // Error handled silently
    } finally {
      setLoadingLeadTypes(false);
    }
  };

  // Handle ESC key to close dialog
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      // Map form data to API format
      const apiData: Partial<Lead> = {
        leadNumber: formData.leadNumber,
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status,
        submissionDeadline: formData.submissionDeadline || undefined,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue.replace(/[^0-9.]/g, '')) : undefined,
        dealValue: formData.dealValue ? parseFloat(formData.dealValue.replace(/[^0-9.]/g, '')) : undefined,
        probability: formData.probability ? parseInt(formData.probability) : undefined,
        emdAmount: formData.emdAmount !== '' ? (() => {
          const parsed = parseFloat(formData.emdAmount.replace(/[^0-9.]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        })() : undefined,
        tenderFees: formData.tenderFees !== '' ? (() => {
          const parsed = parseFloat(formData.tenderFees.replace(/[^0-9.]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        })() : undefined,
        currency: 'INR',
        companyId: formData.companyId ? parseInt(formData.companyId) : undefined,
        leadTypeId: formData.leadTypeId ? parseInt(formData.leadTypeId) : undefined,
        source: formData.source || undefined,
        productLineId: formData.productLineId ? parseInt(formData.productLineId) : undefined,
        subCategory: formData.subCategory || undefined,
      } as any;

      // Create lead with documents
      await onCreate(apiData, selectedFiles);
      
      // Reset form
      setFormData({
        leadNumber: '',
        title: '',
        description: '',
        status: 'Draft',
        submissionDeadline: '',
        estimatedValue: '',
        dealValue: '',
        probability: '',
        emdAmount: '',
        tenderFees: '',
        companyId: '',
        leadTypeId: '',
        source: '',
        productLineId: '',
        subCategory: '',
      });
      setSelectedFiles([]);
      onClose();
    } catch (error) {
      console.error('Error creating lead:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[80%] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg">Create New Lead</h2>
              <p className="text-sm text-muted-foreground">Add a new lead opportunity to track</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSubmit} 
              form="create-lead-form"
              disabled={isUploading}
            >
              <Save className="w-4 h-4 mr-2" />
              {isUploading ? 'Creating...' : 'Create Lead'}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              disabled={isUploading}
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <form 
              id="create-lead-form" 
              onSubmit={handleSubmit} 
              className="space-y-6" 
              encType="multipart/form-data"
              aria-label="Create new lead form"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="leadNumber">Lead Number *</Label>
                  <Input
                    id="leadNumber"
                    placeholder="e.g., LD-2025-001"
                    value={formData.leadNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, leadNumber: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadTypeId">Lead Type *</Label>
                  <Select
                    value={formData.leadTypeId || 'none'}
                    onValueChange={(value) => {
                      // Prevent changing - always keep as "Lead"
                      // This is intentionally disabled
                    }}
                    disabled={true}
                    required
                  >
                    <SelectTrigger id="leadTypeId" className="bg-gray-50">
                      <SelectValue placeholder={loadingLeadTypes ? "Loading..." : "Lead"} />
                    </SelectTrigger>
                    <SelectContent>
                      {leadTypes.map((leadType) => (
                        <SelectItem key={leadType.id} value={leadType.id.toString()}>
                          {leadType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Lead type is automatically set to "Lead" for new leads</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="productLineId">Product Line *</Label>
                  <Select
                    value={formData.productLineId || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, productLineId: value && value !== 'none' ? value : '' })
                    }
                  >
                    <SelectTrigger id="productLineId">
                      <SelectValue placeholder="Select product line" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select product line</SelectItem>
                      {productLines.map((pl) => (
                        <SelectItem key={pl.id} value={pl.id.toString()}>
                          {pl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subCategory">Sub Category</Label>
                  <Select
                    value={formData.subCategory || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, subCategory: value && value !== 'none' ? value : '' })
                    }
                  >
                    <SelectTrigger id="subCategory">
                      <SelectValue placeholder="Select sub category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Hardware">Hardware</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as Lead['status'] })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Submitted">Submitted</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                      <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                      <SelectItem value="Won">Won</SelectItem>
                      <SelectItem value="Lost">Lost</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    placeholder="e.g., Web, Referral, Cold Call"
                    value={formData.source}
                    onChange={(e) =>
                      setFormData({ ...formData, source: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter lead title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter lead description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyId">Client (Company)</Label>
                  <Select
                    value={formData.companyId || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, companyId: value && value !== 'none' ? value : '' })
                    }
                    disabled={loadingCompanies}
                  >
                    <SelectTrigger id="companyId">
                      <SelectValue placeholder={loadingCompanies ? "Loading companies..." : "Select a company"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No Company)</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedValue">Estimated Value</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    placeholder="e.g., 500000"
                    value={formData.estimatedValue}
                    onChange={(e) =>
                      setFormData({ ...formData, estimatedValue: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="dealValue">Deal Value</Label>
                  <Input
                    id="dealValue"
                    type="number"
                    placeholder="e.g., 500000"
                    value={formData.dealValue}
                    onChange={(e) =>
                      setFormData({ ...formData, dealValue: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="probability">Win Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    value={formData.probability}
                    onChange={(e) =>
                      setFormData({ ...formData, probability: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emdAmount">EMD (Earnest Money Deposit)</Label>
                  <Input
                    id="emdAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 50000 (0 is allowed)"
                    value={formData.emdAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, emdAmount: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Money deposited for participating</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenderFees">Tender Fees</Label>
                  <Input
                    id="tenderFees"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 10000 (0 is allowed)"
                    value={formData.tenderFees}
                    onChange={(e) =>
                      setFormData({ ...formData, tenderFees: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Cost of participating</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="submissionDeadline">Submission Deadline *</Label>
                <Input
                  id="submissionDeadline"
                  type="date"
                  value={formData.submissionDeadline}
                  onChange={(e) =>
                    setFormData({ ...formData, submissionDeadline: e.target.value })
                  }
                  required
                />
              </div>

              {/* Document Upload Section */}
              <div className="space-y-2">
                <Label>Documents (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Select Files
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB per file)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm">Selected Files ({selectedFiles.length})</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(index)}
                            className="flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

