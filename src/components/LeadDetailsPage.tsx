import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import type { Lead, LeadActivity, Document, Company, WorkLogReminder, ProductLine } from '../lib/types';
import { documentApi, leadApi, companyApi, reminderApi, userApi, productLineApi } from '../lib/api';
import {
  X,
  FileText,
  Upload,
  Download,
  Trash2,
  Save,
  Clock,
  User,
  Calendar,
  Pencil,
  Bell,
  CheckCircle2,
  AlertCircle,
  Plus,
  Mail,
  Phone,
  DollarSign,
  Building2,
  Loader2,
  Folder,
  List,
  ArrowLeft,
  Eye,
  Sparkles,
  MessageCircle,
  Send,
} from 'lucide-react';

interface LeadDetailsPageProps {
  leadId: number;
  onBack: () => void;
  onUpdate: (lead: Lead) => void;
}

export function LeadDetailsPage({ leadId, onBack, onUpdate }: LeadDetailsPageProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [editedLead, setEditedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);

  useEffect(() => {
    fetchLead();
    fetchProductLines();
  }, [leadId]);

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

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await leadApi.getById(leadId);
      if (response.success && response.data) {
        setLead(response.data);
        setEditedLead(response.data);
      } else {
        setError(response.error || 'Failed to load lead');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg text-gray-700">{error || 'Lead not found'}</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{lead.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Lead Number: {lead.leadNumber || lead.tenderNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm('Convert this Lead to a Tender? It will move to the Tender Dashboard.')) {
                    try {
                      const response = await leadApi.update(leadId, { leadTypeId: 1 }); // 1 = Tender
                      if (response.success) {
                        alert('Converted to Tender successfully');
                        onBack(); // Return to dashboard
                      }
                    } catch (e) {
                      alert('Failed to convert');
                    }
                  }
                }}
              >
                Convert to Tender
              </Button>
              <Badge>{lead.status}</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Lead Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Lead Number</Label>
                <p className="text-base">{lead.leadNumber || lead.tenderNumber}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <p className="text-base">{lead.status}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Client</Label>
                <p className="text-base">{lead.client || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Estimated Value</Label>
                <p className="text-base">
                  {lead.estimatedValue
                    ? `${lead.currency || 'INR'} ${lead.estimatedValue.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
              {lead.dealValue && (
                <div>
                  <Label className="text-sm text-muted-foreground">Deal Value</Label>
                  <p className="text-base">
                    {lead.currency || 'INR'} {lead.dealValue.toLocaleString()}
                  </p>
                </div>
              )}
              {lead.probability !== undefined && (
                <div>
                  <Label className="text-sm text-muted-foreground">Win Probability</Label>
                  <p className="text-base">{lead.probability}%</p>
                </div>
              )}
              {lead.source && (
                <div>
                  <Label className="text-sm text-muted-foreground">Source</Label>
                  <p className="text-base">{lead.source}</p>
                </div>
              )}
              <div>
                <Label className="text-sm text-muted-foreground">Product Line</Label>
                <p className="text-base">
                  {lead.productLineId
                    ? productLines.find(pl => pl.id === lead.productLineId)?.name || `PL-${lead.productLineId}`
                    : 'N/A'}
                </p>
              </div>
              {lead.subCategory && (
                <div>
                  <Label className="text-sm text-muted-foreground">Sub Category</Label>
                  <p className="text-base">{lead.subCategory}</p>
                </div>
              )}
              {lead.submissionDeadline && (
                <div>
                  <Label className="text-sm text-muted-foreground">Submission Deadline</Label>
                  <p className="text-base">
                    {new Date(lead.submissionDeadline).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {lead.description && (
              <div className="mt-4">
                <Label className="text-sm text-muted-foreground">Description</Label>
                <p className="text-base mt-1">{lead.description}</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              Full lead details page is being developed. This is a basic view.
              For full functionality, please use the TenderDetailsPage component
              which works with both tenders and leads.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}


