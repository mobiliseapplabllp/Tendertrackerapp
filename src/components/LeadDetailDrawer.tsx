import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { leadApi } from '../lib/api';
import type { Lead } from '../lib/types';
import { OverviewTab } from './lead-drawer/OverviewTab';
import { DocumentsTab } from './lead-drawer/DocumentsTab';
import { ActivitiesTab } from './lead-drawer/ActivitiesTab';

interface LeadDetailDrawerProps {
    leadId: number | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function LeadDetailDrawer({
    leadId,
    isOpen,
    onClose,
    onUpdate
}: LeadDetailDrawerProps) {
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (isOpen && leadId) {
            fetchLeadDetails();
        } else if (!isOpen) {
            // Reset state when drawer closes
            setActiveTab('overview');
            setError(null);
        }
    }, [isOpen, leadId]);

    const fetchLeadDetails = async () => {
        if (!leadId) return;

        try {
            setLoading(true);
            setError(null);
            const response = await leadApi.getById(leadId);

            if (response.success && response.data) {
                setLead(response.data);
            } else {
                setError(response.error || 'Failed to load lead details');
            }
        } catch (err: any) {
            console.error('Error fetching lead details:', err);
            setError(err.message || 'Failed to load lead details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (updates: Partial<Lead>) => {
        if (!leadId) return;

        try {
            setError(null);
            const response = await leadApi.update(leadId, updates);

            if (response.success) {
                await fetchLeadDetails();
                onUpdate(); // Refresh parent list
            } else {
                setError(response.error || 'Failed to update lead');
            }
        } catch (err: any) {
            console.error('Error updating lead:', err);
            setError(err.message || 'Failed to update lead');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawer-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
                    <div className="flex-1 min-w-0">
                        <h2 id="drawer-title" className="text-xl font-semibold truncate">
                            {lead?.leadNumber || lead?.tenderNumber || 'Lead Details'}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                            {lead?.title || (loading ? 'Loading...' : 'No title')}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Close drawer"
                        className="ml-4 flex-shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" role="status" />
                                <p className="mt-4 text-sm text-muted-foreground">Loading lead details...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full p-6">
                            <div className="text-center max-w-md">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Error Loading Lead</h3>
                                <p className="text-red-600 mb-4 text-sm">{error}</p>
                                <Button onClick={fetchLeadDetails} variant="outline">
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    ) : lead ? (
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="h-full flex flex-col"
                        >
                            <TabsList className="px-6 border-b flex-shrink-0">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="documents">Documents</TabsTrigger>
                                <TabsTrigger value="activities">Activities</TabsTrigger>
                                <TabsTrigger value="ai">AI Features</TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-y-auto">
                                <TabsContent value="overview" className="mt-0 h-full">
                                    <OverviewTab lead={lead} onUpdate={handleUpdate} />
                                </TabsContent>

                                <TabsContent value="documents" className="mt-0 h-full">
                                    <DocumentsTab leadId={lead.id} />
                                </TabsContent>

                                <TabsContent value="activities" className="mt-0 h-full">
                                    <ActivitiesTab leadId={lead.id} />
                                </TabsContent>

                                <TabsContent value="ai" className="mt-0 h-full">
                                    <div className="p-6">
                                        <p className="text-center text-muted-foreground">
                                            AI Features tab - Coming in Phase 5
                                        </p>
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    ) : null}
                </div>
            </div>
        </>
    );
}
