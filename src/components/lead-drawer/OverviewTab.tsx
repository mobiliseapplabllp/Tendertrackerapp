import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, DollarSign, MapPin, User, Building, Pencil, Save, X, AlertCircle, Phone, Mail, Globe, Users, Briefcase } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useConfiguration } from '../../hooks/useConfiguration';
import { companyApi } from '../../lib/api';
import type { Lead, DropdownOption } from '../../lib/types';

interface OverviewTabProps {
    lead: Lead;
    onUpdate: (updates: Partial<Lead>) => Promise<void>;
}

export function OverviewTab({ lead, onUpdate }: OverviewTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Lead>>(lead);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [companyDetails, setCompanyDetails] = useState<any>(null);
    const [companyContacts, setCompanyContacts] = useState<any[]>([]);
    const [loadingCompany, setLoadingCompany] = useState(false);
    const { formatCurrency, formatDate } = useSettings();
    const { getDropdownOptions } = useConfiguration();

    // Fetch full company + contacts when lead has a company_id
    useEffect(() => {
        const companyId = (lead as any).companyId || (lead as any).company_id;
        if (!companyId) {
            setCompanyDetails(null);
            setCompanyContacts([]);
            return;
        }
        setLoadingCompany(true);
        companyApi.getById(companyId)
            .then(res => {
                if (res.success && res.data) {
                    setCompanyDetails(res.data);
                    setCompanyContacts(res.data.contacts || []);
                }
            })
            .catch(() => { /* silent */ })
            .finally(() => setLoadingCompany(false));
    }, [(lead as any).companyId, (lead as any).company_id]);

    const handleSave = async () => {
        // Validation
        if (!editForm.title?.trim()) {
            setError('Title is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Only send fields that the backend accepts for update
            const allowedFields = [
                'title', 'description', 'companyId', 'categoryId', 'leadTypeId', 'salesStageId',
                'status', 'priority', 'estimatedValue', 'dealValue', 'probability', 'currency',
                'submissionDeadline', 'expectedAwardDate', 'expectedCloseDate', 'contractDurationMonths',
                'assignedTo', 'tagIds', 'emdAmount', 'tenderFees', 'source', 'productLineId',
                'subCategory', 'client', 'wonDate', 'lostDate', 'lossReason',
            ];
            const payload: any = {};
            for (const key of allowedFields) {
                const value = (editForm as any)[key];
                // Only include changed fields (skip if value is same as original)
                if (value !== undefined && value !== (lead as any)[key]) {
                    payload[key] = value;
                }
            }

            if (Object.keys(payload).length === 0) {
                setIsEditing(false);
                return;
            }

            await onUpdate(payload);
            setIsEditing(false);
        } catch (err: any) {
            console.error('Failed to save:', err);
            setError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditForm(lead);
        setError(null);
        setIsEditing(false);
    };

    const handleFieldChange = (field: keyof Lead, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
        setError(null); // Clear error on change
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Lead Information</h3>
                {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Error</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Basic Information */}
            <Card className="p-4">
                <h4 className="font-medium mb-4">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-sm font-medium">Lead Number</Label>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {lead.leadNumber || lead.tenderNumber || 'N/A'}
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Status</Label>
                        {isEditing ? (
                            <Select
                                value={editForm.status}
                                onValueChange={(value) => handleFieldChange('status', value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {getDropdownOptions('lead_status').map(option => (
                                        <SelectItem key={option.optionValue} value={option.optionValue}>
                                            {option.optionLabel}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="mt-1">
                                <Badge className={getStatusColor(lead.status)}>
                                    {lead.status}
                                </Badge>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Priority</Label>
                        {isEditing ? (
                            <Select
                                value={editForm.priority}
                                onValueChange={(value) => handleFieldChange('priority', value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {getDropdownOptions('lead_priority').map(option => (
                                        <SelectItem key={option.optionValue} value={option.optionValue}>
                                            {option.optionLabel}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="mt-1">
                                <Badge className={getPriorityColor(lead.priority)}>
                                    {lead.priority}
                                </Badge>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Source</Label>
                        {isEditing ? (
                            <Input
                                value={editForm.source || ''}
                                onChange={(e) => handleFieldChange('source', e.target.value)}
                                className="mt-1"
                                placeholder="e.g., Website, Referral"
                            />
                        ) : (
                            <div className="mt-1 text-sm">{lead.source || 'N/A'}</div>
                        )}
                    </div>

                    <div className="col-span-2">
                        <Label className="text-sm font-medium">
                            Title <span className="text-red-500">*</span>
                        </Label>
                        {isEditing ? (
                            <Input
                                value={editForm.title || ''}
                                onChange={(e) => handleFieldChange('title', e.target.value)}
                                className="mt-1"
                                placeholder="Enter lead title"
                                required
                            />
                        ) : (
                            <div className="mt-1 text-sm">{lead.title}</div>
                        )}
                    </div>

                    <div className="col-span-2">
                        <Label className="text-sm font-medium">Description</Label>
                        {isEditing ? (
                            <Textarea
                                value={editForm.description || ''}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                className="mt-1"
                                rows={3}
                                placeholder="Enter lead description"
                            />
                        ) : (
                            <div className="mt-1 text-sm text-muted-foreground">
                                {lead.description || 'No description'}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Client & Contact Information */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Client Information</h4>
                    {loadingCompany && <span className="text-xs text-gray-400">Loading company details...</span>}
                </div>

                {/* Company Details */}
                {companyDetails ? (
                    <div className="space-y-4">
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                                    <Building className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="font-semibold text-gray-900">{companyDetails.company_name || 'Unnamed Company'}</h5>
                                    {companyDetails.industry && (
                                        <p className="text-xs text-gray-500 mt-0.5">{companyDetails.industry}</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                        {companyDetails.email && (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Mail className="w-3 h-3 text-gray-400" />
                                                <a href={`mailto:${companyDetails.email}`} className="hover:text-indigo-600 truncate">{companyDetails.email}</a>
                                            </div>
                                        )}
                                        {companyDetails.phone && (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Phone className="w-3 h-3 text-gray-400" />
                                                <a href={`tel:${companyDetails.phone}`} className="hover:text-indigo-600">{companyDetails.phone}</a>
                                            </div>
                                        )}
                                        {companyDetails.website && (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Globe className="w-3 h-3 text-gray-400" />
                                                <a href={companyDetails.website.startsWith('http') ? companyDetails.website : `https://${companyDetails.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 truncate">{companyDetails.website}</a>
                                            </div>
                                        )}
                                        {(companyDetails.city || companyDetails.country) && (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <MapPin className="w-3 h-3 text-gray-400" />
                                                <span>{[companyDetails.city, companyDetails.country].filter(Boolean).join(', ')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contacts */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-gray-500" />
                                <h5 className="text-sm font-medium text-gray-700">
                                    Contacts {companyContacts.length > 0 && <span className="text-xs text-gray-400">({companyContacts.length})</span>}
                                </h5>
                            </div>
                            {companyContacts.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">No contacts added for this company yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {companyContacts.map((contact: any) => (
                                        <div key={contact.id} className="flex items-start gap-3 p-2.5 bg-gray-50 border border-gray-100 rounded-lg hover:bg-white hover:shadow-sm transition-all">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                {((contact.first_name || '')[0] || '').toUpperCase()}{((contact.last_name || '')[0] || '').toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                                                    </p>
                                                    {contact.is_primary && (
                                                        <span className="text-[10px] px-1.5 py-0 rounded-full bg-green-100 text-green-700 font-medium">PRIMARY</span>
                                                    )}
                                                </div>
                                                {(contact.position || contact.title) && (
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Briefcase className="w-3 h-3" />
                                                        {contact.position || contact.title}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-3 mt-1 text-xs">
                                                    {contact.email && (
                                                        <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline flex items-center gap-1 truncate">
                                                            <Mail className="w-3 h-3" />
                                                            {contact.email}
                                                        </a>
                                                    )}
                                                    {(contact.phone || contact.mobile) && (
                                                        <a href={`tel:${contact.phone || contact.mobile}`} className="text-gray-600 hover:text-indigo-600 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {contact.phone || contact.mobile}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Fallback when no company linked — show editable fields */
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <Building className="w-4 h-4" />
                                Client Name
                            </Label>
                            {isEditing ? (
                                <Input
                                    value={editForm.client || ''}
                                    onChange={(e) => handleFieldChange('client', e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter client name"
                                />
                            ) : (
                                <div className="mt-1 text-sm">{lead.client || 'N/A'}</div>
                            )}
                        </div>
                        <div>
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <MapPin className="w-4 h-4" />
                                Location / Source
                            </Label>
                            {isEditing ? (
                                <Input
                                    value={editForm.source || ''}
                                    onChange={(e) => handleFieldChange('source', e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter location"
                                />
                            ) : (
                                <div className="mt-1 text-sm">{lead.source || 'N/A'}</div>
                            )}
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3" />
                                No company linked to this lead. Link a company to see full company and contact details.
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Financial & Timeline */}
            <Card className="p-4">
                <h4 className="font-medium mb-4">Financial & Timeline</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <DollarSign className="w-4 h-4" />
                            Estimated Value
                        </Label>
                        {isEditing ? (
                            <Input
                                type="number"
                                value={editForm.estimatedValue || ''}
                                onChange={(e) => handleFieldChange('estimatedValue', parseFloat(e.target.value) || null)}
                                className="mt-1"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        ) : (
                            <div className="mt-1 text-sm">
                                {lead.estimatedValue || lead.dealValue
                                    ? formatCurrency(lead.dealValue || lead.estimatedValue || 0, lead.currency)
                                    : 'N/A'}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Currency</Label>
                        {isEditing ? (
                            <Select
                                value={editForm.currency || 'INR'}
                                onValueChange={(value) => handleFieldChange('currency', value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {getDropdownOptions('currency').map(option => (
                                        <SelectItem key={option.optionValue} value={option.optionValue}>
                                            {option.optionLabel}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="mt-1 text-sm">{lead.currency || 'INR'}</div>
                        )}
                    </div>

                    <div>
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="w-4 h-4" />
                            Submission Deadline
                        </Label>
                        {isEditing ? (
                            <Input
                                type="date"
                                value={editForm.submissionDeadline?.split('T')[0] || ''}
                                onChange={(e) => handleFieldChange('submissionDeadline', e.target.value)}
                                className="mt-1"
                            />
                        ) : (
                            <div className="mt-1 text-sm">
                                {lead.submissionDeadline ? formatDate(lead.submissionDeadline) : 'N/A'}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Expected Close Date</Label>
                        {isEditing ? (
                            <Input
                                type="date"
                                value={editForm.expectedCloseDate?.split('T')[0] || ''}
                                onChange={(e) => handleFieldChange('expectedCloseDate', e.target.value)}
                                className="mt-1"
                            />
                        ) : (
                            <div className="mt-1 text-sm">
                                {lead.expectedCloseDate ? formatDate(lead.expectedCloseDate) : 'N/A'}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Probability (%)</Label>
                        {isEditing ? (
                            <Input
                                type="number"
                                value={editForm.probability || ''}
                                onChange={(e) => handleFieldChange('probability', parseInt(e.target.value) || null)}
                                className="mt-1"
                                placeholder="0"
                                min="0"
                                max="100"
                            />
                        ) : (
                            <div className="mt-1 text-sm">
                                {lead.probability ? `${lead.probability}%` : 'N/A'}
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <User className="w-4 h-4" />
                            Created By
                        </Label>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {typeof lead.createdBy === 'string' ? lead.createdBy : `User #${lead.createdBy}`}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Metadata */}
            <Card className="p-4">
                <h4 className="font-medium mb-4">Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <Label className="text-xs text-muted-foreground">Created At</Label>
                        <div className="mt-1">{formatDate(lead.createdAt)}</div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">Last Updated</Label>
                        <div className="mt-1">{formatDate(lead.updatedAt)}</div>
                    </div>
                    {lead.updatedBy && (
                        <div>
                            <Label className="text-xs text-muted-foreground">Updated By</Label>
                            <div className="mt-1">{lead.updatedBy}</div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        'Draft': 'bg-gray-100 text-gray-800',
        'Submitted': 'bg-blue-100 text-blue-800',
        'Under Review': 'bg-yellow-100 text-yellow-800',
        'Shortlisted': 'bg-purple-100 text-purple-800',
        'Won': 'bg-green-100 text-green-800',
        'Lost': 'bg-red-100 text-red-800',
        'Cancelled': 'bg-gray-100 text-gray-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
        'Low': 'bg-gray-100 text-gray-700',
        'Medium': 'bg-blue-100 text-blue-700',
        'High': 'bg-orange-100 text-orange-700',
        'Critical': 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
}
