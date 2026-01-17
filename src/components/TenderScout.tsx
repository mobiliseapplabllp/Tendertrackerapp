import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
    Search,
    Play,
    TrendingUp,
    Clock,
    ExternalLink,
    Download,
    Eye,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Trash2
} from 'lucide-react';
import { tenderScoutApi } from '../lib/api';
import type { TenderScoutResult } from '../lib/types';

export function TenderScout() {
    const [results, setResults] = useState<TenderScoutResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [scouting, setScouting] = useState(false);
    const [selectedResults, setSelectedResults] = useState<number[]>([]);
    const [stats, setStats] = useState({ newTenders: 0, totalDiscovered: 0, imported: 0, avgRelevance: 0 });
    const [filter, setFilter] = useState<'new' | 'all' | 'archived'>('new');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const statusParam = filter === 'new' ? 'new' : filter === 'archived' ? 'archived' : undefined;
            const [resultsData, statsData] = await Promise.all([
                tenderScoutApi.getResults({
                    status: statusParam,
                    minRelevance: 30,
                    limit: 50
                }),
                tenderScoutApi.getStats()
            ]);

            if (resultsData.success) {
                const newResults = resultsData.data || [];
                setResults(newResults);
                setSelectedResults((prev) => prev.filter((id) => newResults.some((result) => result.id === id)));
            }

            if (statsData.success) {
                setStats(statsData.data || { newTenders: 0, totalDiscovered: 0, imported: 0, avgRelevance: 0 });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleRunScout = async () => {
        try {
            setScouting(true);
            setError(null);
            setSuccess(null);

            const response = await tenderScoutApi.runScout();

            if (response.success) {
                const data = response.data || [];
                const totalNew = data.reduce((sum: number, r: any) => sum + (r.new || 0), 0);
                setSuccess(`Scout completed! Found ${totalNew} new tenders.`);
                await loadData();
            }
        } catch (err: any) {
            setError(err.message || 'Scout failed');
        } finally {
            setScouting(false);
        }
    };

    const handleImport = async (id: number) => {
        try {
            const response = await tenderScoutApi.importResult(id);
            if (response.success) {
                setSuccess(`Tender imported successfully! ID: ${response.data?.tenderId}`);
                await loadData();
            }
        } catch (err: any) {
            setError(err.message || 'Import failed');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedResults.length === 0) {
            return;
        }

        if (!confirm('Delete selected scout results? This cannot be undone.')) {
            return;
        }

        try {
            const response = await tenderScoutApi.deleteResultsBulk(selectedResults);
            if (response.success) {
                setSuccess('Selected scout results deleted');
                await loadData();
                setSelectedResults([]);
            }
        } catch (err: any) {
            setError(err.message || 'Bulk delete failed');
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedResults((prev) =>
            prev.includes(id) ? prev.filter((selected) => selected !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedResults.length === results.length) {
            setSelectedResults([]);
        } else {
            setSelectedResults(results.map((result) => result.id));
        }
    };

    const handleDeleteResult = async (id: number) => {
        if (!confirm('Are you sure you want to delete this scout result? This cannot be undone.')) {
            return;
        }

        try {
            const response = await tenderScoutApi.deleteResult(id);
            if (response.success) {
                setSuccess('Scout result deleted successfully');
                await loadData();
            } else {
                setError(response.error || 'Delete failed');
            }
        } catch (err: any) {
            setError(err.message || 'Delete failed');
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await tenderScoutApi.updateResultStatus(id, status);
            await loadData();
        } catch (err: any) {
            setError(err.message || 'Status update failed');
        }
    };

    const getRelevanceBadge = (score: number) => {
        if (score >= 80) return <Badge className="bg-green-500">High: {score}%</Badge>;
        if (score >= 60) return <Badge className="bg-yellow-500">Medium: {score}%</Badge>;
        return <Badge className="bg-gray-500">Low: {score}%</Badge>;
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            new: 'bg-blue-500',
            reviewed: 'bg-purple-500',
            imported: 'bg-green-500',
            ignored: 'bg-gray-500'
        };
        return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>;
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold flex items-center gap-2">
                            <Search className="w-6 h-6" />
                            Tender Scout
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Automated tender discovery from GeM, eProcurement, and government portals
                        </p>
                    </div>
                    <Button onClick={handleRunScout} disabled={scouting} size="lg">
                        {scouting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Scouting...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Run Scout Now
                            </>
                        )}
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">New Tenders</p>
                                <p className="text-2xl font-bold">{stats.newTenders}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-blue-500" />
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Discovered</p>
                                <p className="text-2xl font-bold">{stats.totalDiscovered}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-purple-500" />
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Imported</p>
                                <p className="text-2xl font-bold">{stats.imported}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Relevance</p>
                                <p className="text-2xl font-bold">{stats.avgRelevance}%</p>
                            </div>
                            <Clock className="w-8 h-8 text-orange-500" />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <p className="text-red-800 text-sm">{error}</p>
                    <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}
            {success && (
                <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                    <p className="text-green-800 text-sm">{success}</p>
                    <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* Filters */}
            <div className="px-6 py-4 bg-white border-b">
                <div className="flex gap-2 flex-wrap items-center">
                    <Button
                        variant={filter === 'new' ? 'default' : 'outline'}
                        onClick={() => setFilter('new')}
                    >
                        New ({stats.newTenders})
                    </Button>
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilter('all')}
                    >
                        All ({stats.totalDiscovered})
                    </Button>
                    <Button
                        variant={filter === 'archived' ? 'default' : 'outline'}
                        onClick={() => setFilter('archived')}
                    >
                        Archived
                    </Button>
                    <Button size="sm" variant="outline" onClick={selectAll}>
                        {selectedResults.length === results.length ? 'Clear selection' : 'Select all'}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={selectedResults.length === 0}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete selected ({selectedResults.length})
                    </Button>
                </div>
            </div>

            {/* Results */}
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-4">
                    {results.length === 0 ? (
                        <Card className="p-12 text-center">
                            <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No tenders found</h3>
                            <p className="text-muted-foreground mb-4">
                                Click "Run Scout Now" to search for new tender opportunities
                            </p>
                            <Button onClick={handleRunScout} disabled={scouting}>
                                <Play className="w-4 h-4 mr-2" />
                                Run Scout
                            </Button>
                        </Card>
                    ) : (
                        results.map((result) => (
                            <Card key={result.id} className="p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {getRelevanceBadge(result.relevanceScore)}
                                            {getStatusBadge(result.status)}
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(result.discoveredAt).toLocaleDateString()}
                                            </span>
                                            {result.interestName && (
                                                <span className="text-xs text-muted-foreground">
                                                    Profile: {result.interestName}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{result.title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            {result.organization && (
                                                <span>🏢 {result.organization}</span>
                                            )}
                                            {result.location && (
                                                <span>📍 {result.location}</span>
                                            )}
                                            {result.estimatedValue && (
                                                <span>💰 {result.currency} {result.estimatedValue.toLocaleString()}</span>
                                            )}
                                            {result.deadline && (
                                                <span>⏰ {new Date(result.deadline).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedResults.includes(result.id)}
                                        onChange={() => toggleSelection(result.id)}
                                    />
                                    <span className="text-xs text-muted-foreground">Selected for bulk actions</span>
                                </div>

                                {result.description && (
                                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                                        {result.description}
                                    </p>
                                )}

                                {result.matchedKeywords && result.matchedKeywords.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {result.matchedKeywords.map((keyword, idx) => (
                                            <Badge key={idx} variant="outline">
                                                {keyword}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {result.aiSummary && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm font-medium text-blue-900 mb-2">🤖 AI Summary:</p>
                                        <p className="text-sm text-blue-800 whitespace-pre-line">{result.aiSummary}</p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    {result.status === 'new' && (
                                        <>
                                            <Button
                                                size="sm"
                                                onClick={() => handleImport(result.id)}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Import
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleUpdateStatus(result.id, 'reviewed')}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Mark Reviewed
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleUpdateStatus(result.id, 'ignored')}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Ignore
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                        onClick={() => handleDeleteResult(result.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                    {result.url && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(result.url, '_blank')}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            View Source
                                        </Button>
                                    )}
                                    {result.importedTenderId && (
                                        <Badge className="bg-green-500">
                                            Imported as Tender #{result.importedTenderId}
                                        </Badge>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
