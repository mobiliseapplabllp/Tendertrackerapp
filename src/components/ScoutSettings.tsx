import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { adminApi } from '../lib/api';
import { Save, Eye, EyeOff, Search, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

export function ScoutSettings() {
    const [apiKey, setApiKey] = useState('');
    const [engineId, setEngineId] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getConfig();
            if (response.success && response.data) {
                const settings = response.data;
                const apiKeySetting = settings.find((s: any) => s.key === 'google_search_api_key');
                const engineIdSetting = settings.find((s: any) => s.key === 'google_search_engine_id');

                setApiKey(apiKeySetting?.value || '');
                setEngineId(engineIdSetting?.value || '');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            // Save both settings
            await adminApi.updateConfig('google_search_api_key', apiKey);
            await adminApi.updateConfig('google_search_engine_id', engineId);

            setSuccess('Scout settings saved successfully!');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-6">
            {/* Success/Error Messages */}
            {success && (
                <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="text-sm text-green-800">{success}</p>
                    </div>
                </Card>
            )}

            {error && (
                <Card className="p-4 bg-red-50 border-red-200">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                </Card>
            )}

            {/* Info Card */}
            <Card className="p-6 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                    <Search className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-2">Google Custom Search API</h3>
                        <p className="text-sm text-blue-800 mb-3">
                            Configure Google Custom Search API to enable automated tender discovery from Indian government websites.
                        </p>
                        <div className="text-sm text-blue-800 space-y-1">
                            <p>• <strong>Free Tier:</strong> 100 queries/day</p>
                            <p>• <strong>Paid:</strong> $5 per 1,000 queries</p>
                            <p>• <strong>Setup Time:</strong> ~5 minutes</p>
                        </div>
                        <a
                            href="https://developers.google.com/custom-search/v1/overview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-3"
                        >
                            View Setup Guide <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </Card>

            {/* API Configuration */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">API Credentials</h3>

                <div className="space-y-4">
                    {/* API Key */}
                    <div className="space-y-2">
                        <Label htmlFor="google-api-key">
                            Google Custom Search API Key <span className="text-red-600">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="google-api-key"
                                type={showApiKey ? 'text' : 'password'}
                                placeholder="AIzaSy..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Get your API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a>
                        </p>
                    </div>

                    {/* Engine ID */}
                    <div className="space-y-2">
                        <Label htmlFor="google-engine-id">
                            Custom Search Engine ID <span className="text-red-600">*</span>
                        </Label>
                        <Input
                            id="google-engine-id"
                            placeholder="0123456789abcdef..."
                            value={engineId}
                            onChange={(e) => setEngineId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Create a search engine at <a href="https://programmablesearchengine.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Programmable Search Engine</a>
                        </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3 pt-4">
                        <Button onClick={handleSave} disabled={saving || !apiKey || !engineId}>
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Settings
                                </>
                            )}
                        </Button>
                        {!apiKey || !engineId ? (
                            <p className="text-sm text-muted-foreground">
                                Both fields are required
                            </p>
                        ) : null}
                    </div>
                </div>
            </Card>

            {/* Setup Instructions */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Setup Guide</h3>
                <div className="space-y-4 text-sm">
                    <div>
                        <p className="font-semibold mb-1">Step 1: Get API Key</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                            <li>Go to Google Cloud Console</li>
                            <li>Enable "Custom Search API"</li>
                            <li>Create credentials → API Key</li>
                            <li>Copy the API key</li>
                        </ol>
                    </div>

                    <div>
                        <p className="font-semibold mb-1">Step 2: Create Search Engine</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                            <li>Go to Programmable Search Engine</li>
                            <li>Click "Add" to create new</li>
                            <li>Sites to search: <code className="bg-gray-100 px-1 rounded">*.gov.in/*</code></li>
                            <li>Copy the Search engine ID (cx parameter)</li>
                        </ol>
                    </div>

                    <div>
                        <p className="font-semibold mb-1">Step 3: Save & Test</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                            <li>Paste both values above</li>
                            <li>Click "Save Settings"</li>
                            <li>Go to Tender Scout and click "Run Scout Now"</li>
                            <li>You should see tenders discovered!</li>
                        </ol>
                    </div>
                </div>
            </Card>
        </div>
    );
}
