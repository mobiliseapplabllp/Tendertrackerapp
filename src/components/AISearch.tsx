import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Search, Globe, FileText, X } from 'lucide-react';
import { tenderScoutApi } from '../lib/api';
import type { TenderScoutInterest, TenderScoutResult, AISearchResult } from '../lib/types';

export function AISearch() {
    const [interests, setInterests] = useState<TenderScoutInterest[]>([]);
    const [selectedInterest, setSelectedInterest] = useState<number | null>(null);
    const [contextResults, setContextResults] = useState<TenderScoutResult[]>([]);
    const [aiResults, setAIResults] = useState<AISearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingContext, setLoadingContext] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadInterests();
    }, []);

    useEffect(() => {
        if (selectedInterest) {
            loadContext(selectedInterest);
        }
    }, [selectedInterest]);

    const loadInterests = async () => {
        try {
            const response = await tenderScoutApi.getInterests();
            if (response.success) {
                setInterests(response.data || []);
                if (!selectedInterest && response.data?.length) {
                    setSelectedInterest(response.data[0].id);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load interests');
        }
    };

    const loadContext = async (interestId: number) => {
        try {
            setLoadingContext(true);
            const response = await tenderScoutApi.getResults({ status: 'new', limit: 5, minRelevance: 0 });
            if (response.success) {
                setContextResults((response.data || []).filter((r) => r.interestId === interestId));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load context tenders');
        } finally {
            setLoadingContext(false);
        }
    };

    const handleSearch = async () => {
        if (!selectedInterest) return;
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);
            const response = await tenderScoutApi.aiSearch(selectedInterest);
            if (response.success) {
                setAIResults(response.data || []);
                setSuccess(`AI returned ${response.data?.length || 0} candidate(s).`);
            }
        } catch (err: any) {
            setError(err.message || 'AI search failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Search className="w-6 h-6 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-semibold">AI Tender Search</h1>
                        <p className="text-sm text-muted-foreground">
                            Use AI models to scan profiles and previous results for new opportunities.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select onValueChange={(value) => setSelectedInterest(parseInt(value, 10))} value={selectedInterest?.toString()}>
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="Choose profile" />
                        </SelectTrigger>
                        <SelectContent>
                            {interests.map((interest) => (
                                <SelectItem key={interest.id} value={interest.id.toString()}>
                                    {interest.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSearch} disabled={loading || !selectedInterest}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run AI Search'}
                    </Button>
                </div>
            </div>
            <div className="px-6 py-4 space-y-3">
                {error && (
                    <Card className="bg-red-50 border-red-200 text-red-800">
                        <div className="flex items-center justify-between">
                            <span>{error}</span>
                            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                )}
                {success && (
                    <Card className="bg-green-50 border-green-200 text-green-800">
                        {success}
                    </Card>
                )}
            </div>
            <div className="px-6 pb-6 flex flex-col gap-6">
                <Card className="p-4">
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Profile keywords + context
                    </h2>
                    <p className="text-sm text-muted-foreground mb-3">
                        The AI prompt includes the profile keywords and recent scout results (with file links) to ground its search.
                    </p>
                    {loadingContext ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {contextResults.map((result) => (
                                <Badge key={result.id} variant="outline">
                                    {result.title}
                                </Badge>
                            ))}
                        </div>
                    )}
                </Card>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            AI Discovered Tenders
                        </h2>
                        <span className="text-sm text-muted-foreground">Confidence based on AI response</span>
                    </div>
                    {aiResults.length === 0 ? (
                        <Card className="p-6 text-center text-muted-foreground">No AI results yet. Run a search.</Card>
                    ) : (
                        <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-4">
                                {aiResults.map((result, index) => (
                                    <Card key={`${result.title}-${index}`} className="p-4 border">
                                        <div className="flex justify-between items-start gap-3">
                                            <div>
                                                <h3 className="text-lg font-semibold">{result.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
                                            </div>
                                            <Badge variant="outline">{result.confidence?.toFixed(0) || 0}%</Badge>
                                        </div>
                                        {result.fileLinks && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {result.fileLinks.map((link, idx) => (
                                                    <Button
                                                        key={`${link}-${idx}`}
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(link, '_blank')}
                                                    >
                                                        File {idx + 1}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                        {result.matchedKeywords && result.matchedKeywords.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {result.matchedKeywords.map((keyword, idx) => (
                                                    <Badge key={`${keyword}-${idx}`}>{keyword}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </div>
        </div>
    );
}

