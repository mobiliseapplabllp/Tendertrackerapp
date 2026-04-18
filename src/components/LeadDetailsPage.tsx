import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { Lead, ProductLine } from '../lib/types';
import { leadApi, productLineApi } from '../lib/api';
import { OverviewTab } from './lead-drawer/OverviewTab';
import { DocumentsTab } from './lead-drawer/DocumentsTab';
import { ActivitiesTab } from './lead-drawer/ActivitiesTab';
import { WorkLogTab } from './lead-drawer/WorkLogTab';
import { AuditLogTab } from './lead-drawer/AuditLogTab';
import { AISummaryTab } from './lead-drawer/AISummaryTab';
import { ProposalTab } from './lead-drawer/ProposalTab';
import EnhancedTasksTab from './EnhancedTasksTab';
import {
  ArrowLeft, Loader2, AlertCircle, FileText, Clock, Shield,
  Sparkles, CheckSquare, MessageSquare, ScrollText
} from 'lucide-react';

interface LeadDetailsPageProps {
  leadId: number;
  onBack: () => void;
  onUpdate: (lead: Lead) => void;
}

export function LeadDetailsPage({ leadId, onBack, onUpdate }: LeadDetailsPageProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await leadApi.getById(leadId);
      if (response.success && response.data) {
        setLead(response.data);
      } else {
        setError(response.error || 'Failed to load lead');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<Lead>) => {
    try {
      setError(null);
      const response = await leadApi.update(leadId, updates);
      if (response.success) {
        await fetchLead();
      } else {
        setError(response.error || 'Failed to update lead');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update lead');
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
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Leads
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
              <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to leads">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{lead.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {lead.leadNumber || lead.tenderNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm('Convert this Lead to a Tender?')) {
                    try {
                      const response = await leadApi.update(leadId, { leadTypeId: 1 });
                      if (response.success) { alert('Converted to Tender'); onBack(); }
                    } catch { alert('Failed to convert'); }
                  }
                }}
              >
                Convert to Tender
              </Button>
              <Badge className={
                lead.status === 'Won' ? 'bg-green-100 text-green-800' :
                lead.status === 'Lost' ? 'bg-red-100 text-red-800' :
                lead.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                'bg-blue-100 text-blue-800'
              }>{lead.status}</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-6">
          <TabsList className="flex-wrap gap-0">
            <TabsTrigger value="overview" className="text-sm py-3 px-4 flex items-center gap-2 font-medium"><FileText className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="documents" className="text-sm py-3 px-4 flex items-center gap-2 font-medium"><FileText className="w-4 h-4" />Documents</TabsTrigger>
            <TabsTrigger value="proposals" className="text-sm py-3 px-4 flex items-center gap-2 font-medium"><ScrollText className="w-4 h-4 text-indigo-500" />Proposals</TabsTrigger>
            <TabsTrigger value="tasks" className="text-sm py-3 px-4 flex items-center gap-2 font-medium"><CheckSquare className="w-4 h-4" />Tasks</TabsTrigger>
            <TabsTrigger value="worklog" className="text-sm py-3 px-4 flex items-center gap-2 font-medium"><Clock className="w-4 h-4" />Work Log</TabsTrigger>
            <TabsTrigger value="activities" className="text-sm py-3 px-4 flex items-center gap-2 font-medium"><MessageSquare className="w-4 h-4" />Activities</TabsTrigger>
            <TabsTrigger value="audit" className="text-sm py-3 px-4 flex items-center gap-2 font-medium"><Shield className="w-4 h-4" />Audit</TabsTrigger>
            <TabsTrigger value="ai" className="text-sm py-3 px-4 flex items-center gap-2 font-medium"><Sparkles className="w-4 h-4 text-indigo-500" />AI</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <TabsContent value="overview" className="mt-0">
              <OverviewTab lead={lead} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <DocumentsTab leadId={lead.id} />
            </TabsContent>

            <TabsContent value="proposals" className="mt-0">
              <ProposalTab leadId={lead.id} lead={lead} userRole={(lead as any).userRole} />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <EnhancedTasksTab tender={lead} users={[]} reminders={[]} onRefresh={fetchLead} />
            </TabsContent>

            <TabsContent value="worklog" className="mt-0">
              <WorkLogTab leadId={lead.id} />
            </TabsContent>

            <TabsContent value="activities" className="mt-0">
              <ActivitiesTab leadId={lead.id} />
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              <AuditLogTab leadId={lead.id} />
            </TabsContent>

            <TabsContent value="ai" className="mt-0">
              <AISummaryTab leadId={lead.id} />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
