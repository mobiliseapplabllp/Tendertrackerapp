import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { tenderScoutApi } from '../lib/api';
import type { TenderScoutInterest, TenderScoutSource } from '../lib/types';
import {
    Settings,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    CheckCircle2,
    AlertCircle,
    Target,
    Search,
    Globe,
} from 'lucide-react';

export function ScoutConfig() {
    const [activeTab, setActiveTab] = useState('profiles');
    const [interests, setInterests] = useState<TenderScoutInterest[]>([]);
    const [sources, setSources] = useState<TenderScoutSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Interest Profile Form State
    const [showProfileForm, setShowProfileForm] = useState(false);
    const [editingProfile, setEditingProfile] = useState<TenderScoutInterest | null>(null);
    const [profileForm, setProfileForm] = useState({
        name: '',
        description: '',
        keywords: [] as string[],
        categories: [] as string[],
        regions: [] as string[],
        minValue: '',
        maxValue: '',
        autoImportThreshold: 80,
        minRelevance: 25,
        isActive: true,
    });
    const [keywordInput, setKeywordInput] = useState('');
    const [categoryInput, setCategoryInput] = useState('');
    const [regionInput, setRegionInput] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    // Helper function to safely parse JSON or handle plain strings
    const safeJSONParse = (value: any): string[] => {
        if (!value) return [];

        // If it's already an array, return it directly
        if (Array.isArray(value)) return value;

        // If it's a string, try to parse it
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [value];
            } catch {
                // If it's not valid JSON, treat it as a single value
                return [value];
            }
        }

        // For any other type, return empty array
        return [];
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [interestsRes, sourcesRes] = await Promise.all([
                tenderScoutApi.getInterests(),
                tenderScoutApi.getSources(),
            ]);

            if (interestsRes.success && interestsRes.data) {
                setInterests(interestsRes.data);
            }
            if (sourcesRes.success && sourcesRes.data) {
                setSources(sourcesRes.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleAddKeyword = () => {
        if (keywordInput.trim() && !profileForm.keywords.includes(keywordInput.trim())) {
            setProfileForm({
                ...profileForm,
                keywords: [...profileForm.keywords, keywordInput.trim()],
            });
            setKeywordInput('');
        }
    };

    const handleRemoveKeyword = (keyword: string) => {
        setProfileForm({
            ...profileForm,
            keywords: profileForm.keywords.filter((k) => k !== keyword),
        });
    };

    const handleAddCategory = () => {
        if (categoryInput.trim() && !profileForm.categories.includes(categoryInput.trim())) {
            setProfileForm({
                ...profileForm,
                categories: [...profileForm.categories, categoryInput.trim()],
            });
            setCategoryInput('');
        }
    };

    const handleRemoveCategory = (category: string) => {
        setProfileForm({
            ...profileForm,
            categories: profileForm.categories.filter((c) => c !== category),
        });
    };

    const handleAddRegion = () => {
        if (regionInput.trim() && !profileForm.regions.includes(regionInput.trim())) {
            setProfileForm({
                ...profileForm,
                regions: [...profileForm.regions, regionInput.trim()],
            });
            setRegionInput('');
        }
    };

    const handleRemoveRegion = (region: string) => {
        setProfileForm({
            ...profileForm,
            regions: profileForm.regions.filter((r) => r !== region),
        });
    };

    const handleOpenProfileForm = (profile?: TenderScoutInterest) => {
        if (profile) {
            setEditingProfile(profile);
            setProfileForm({
                name: profile.name,
                description: profile.description || '',
                keywords: safeJSONParse(profile.keywords),
                categories: safeJSONParse(profile.categories),
                regions: safeJSONParse(profile.regions),
                minValue: profile.minValue?.toString() || '',
                maxValue: profile.maxValue?.toString() || '',
                autoImportThreshold: profile.autoImportThreshold,
                minRelevance: profile.minRelevance ?? 25,
                isActive: profile.isActive,
            });
        } else {
            setEditingProfile(null);
            setProfileForm({
                name: '',
                description: '',
                keywords: [],
                categories: [],
                regions: [],
                minValue: '',
                maxValue: '',
                autoImportThreshold: 80,
                minRelevance: 25,
                isActive: true,
            });
        }
        setShowProfileForm(true);
    };

    const handleCloseProfileForm = () => {
        setShowProfileForm(false);
        setEditingProfile(null);
        setKeywordInput('');
        setCategoryInput('');
        setRegionInput('');
    };

    const handleSaveProfile = async () => {
        try {
            setError(null);
            setSuccess(null);

            if (!profileForm.name.trim()) {
                setError('Profile name is required');
                return;
            }

            if (profileForm.keywords.length === 0) {
                setError('At least one keyword is required');
                return;
            }

            const data = {
                name: profileForm.name.trim(),
                description: profileForm.description.trim() || undefined,
                keywords: profileForm.keywords,
                categories: profileForm.categories.length > 0 ? profileForm.categories : undefined,
                regions: profileForm.regions.length > 0 ? profileForm.regions : undefined,
                minValue: profileForm.minValue ? parseFloat(profileForm.minValue) : undefined,
                maxValue: profileForm.maxValue ? parseFloat(profileForm.maxValue) : undefined,
                autoImportThreshold: profileForm.autoImportThreshold,
                minRelevance: profileForm.minRelevance,
                isActive: profileForm.isActive,
            };

            let response;
            if (editingProfile) {
                response = await tenderScoutApi.updateInterest(editingProfile.id, data);
            } else {
                response = await tenderScoutApi.createInterest(data);
            }

            if (response.success) {
                setSuccess(editingProfile ? 'Profile updated successfully' : 'Profile created successfully');
                setTimeout(() => setSuccess(null), 3000);
                handleCloseProfileForm();
                await loadData();
            } else {
                setError(response.error || 'Failed to save profile');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save profile');
        }
    };

    const handleDeleteProfile = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setError(null);
            const response = await tenderScoutApi.deleteInterest(id);
            if (response.success) {
                setSuccess('Profile deleted successfully');
                setTimeout(() => setSuccess(null), 3000);
                await loadData();
            } else {
                setError(response.error || 'Failed to delete profile');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete profile');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Settings className="w-6 h-6" />
                            Scout Configuration
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage interest profiles, scout sources, and search scope
                        </p>
                    </div>
                </div>
            </div>

            {/* Success/Error Messages */}
            {(success || error) && (
                <div className="px-6 pt-4 flex-shrink-0">
                    {success && (
                        <Card className="p-4 bg-green-50 border-green-200 mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <p className="text-sm text-green-800">{success}</p>
                            </div>
                        </Card>
                    )}

                    {error && (
                        <Card className="p-4 bg-red-50 border-red-200 mb-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Main Content - Natural Scroll */}
            <div className="flex-1">
                <div className="px-6 pb-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList>
                            <TabsTrigger value="profiles">
                                <Target className="w-4 h-4 mr-2" />
                                Interest Profiles
                            </TabsTrigger>
                            <TabsTrigger value="sources">
                                <Globe className="w-4 h-4 mr-2" />
                                Scout Sources
                            </TabsTrigger>
                        </TabsList>

                        {/* Interest Profiles Tab */}
                        <TabsContent value="profiles" className="space-y-4 mt-6">
                            {!showProfileForm ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-lg font-semibold">Interest Profiles</h2>
                                        <Button onClick={() => handleOpenProfileForm()}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Profile
                                        </Button>
                                    </div>

                                    {interests.length === 0 ? (
                                        <Card className="p-8 text-center">
                                            <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                            <p className="text-gray-600 mb-4">No interest profiles configured</p>
                                            <Button onClick={() => handleOpenProfileForm()}>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Create Your First Profile
                                            </Button>
                                        </Card>
                                    ) : (
                                        <div className="grid gap-4">
                                            {interests.map((profile) => (
                                                <Card key={profile.id} className="p-6">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h3 className="text-lg font-semibold">{profile.name}</h3>
                                                                <Badge variant={profile.isActive ? 'default' : 'secondary'}>
                                                                    {profile.isActive ? 'Active' : 'Inactive'}
                                                                </Badge>
                                                            </div>
                                                            {profile.description && (
                                                                <p className="text-sm text-muted-foreground mb-3">{profile.description}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleOpenProfileForm(profile)}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeleteProfile(profile.id, profile.name)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground">Keywords</Label>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {safeJSONParse(profile.keywords).slice(0, 10).map((keyword: string, idx: number) => (
                                                                    <Badge key={idx} variant="outline">
                                                                        {keyword}
                                                                    </Badge>
                                                                ))}
                                                                {safeJSONParse(profile.keywords).length > 10 && (
                                                                    <Badge variant="outline">
                                                                        +{safeJSONParse(profile.keywords).length - 10} more
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            {profile.categories && (
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Categories</Label>
                                                                    <p>{safeJSONParse(profile.categories).join(', ')}</p>
                                                                </div>
                                                            )}
                                                            {profile.regions && (
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Regions</Label>
                                                                    <p>{safeJSONParse(profile.regions).join(', ')}</p>
                                                                </div>
                                                            )}
                                                            {(profile.minValue || profile.maxValue) && (
                                                                <div>
                                                                    <Label className="text-xs text-muted-foreground">Value Range</Label>
                                                                    <p>
                                                                        ₹{profile.minValue?.toLocaleString() || '0'} - ₹
                                                                        {profile.maxValue?.toLocaleString() || '∞'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Auto-Import</Label>
                                                                <p>≥{profile.autoImportThreshold}% relevance</p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground">Save Threshold</Label>
                                                                <p>{profile.minRelevance ?? 25}% relevance</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Card className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold">
                                            {editingProfile ? 'Edit Profile' : 'Create New Profile'}
                                        </h2>
                                        <Button variant="ghost" size="sm" onClick={handleCloseProfileForm}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Name */}
                                        <div>
                                            <Label htmlFor="profile-name">
                                                Profile Name <span className="text-red-600">*</span>
                                            </Label>
                                            <Input
                                                id="profile-name"
                                                value={profileForm.name}
                                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                placeholder="e.g., IT Services Opportunities"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <Label htmlFor="profile-description">Description</Label>
                                            <Textarea
                                                id="profile-description"
                                                value={profileForm.description}
                                                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                                                placeholder="Optional description of this profile"
                                                rows={2}
                                            />
                                        </div>

                                        {/* Keywords */}
                                        <div>
                                            <Label>
                                                Keywords <span className="text-red-600">*</span>
                                            </Label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {profileForm.keywords.map((keyword, idx) => (
                                                    <Badge key={idx} variant="secondary" className="gap-1">
                                                        {keyword}
                                                        <button onClick={() => handleRemoveKeyword(keyword)}>
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={keywordInput}
                                                    onChange={(e) => setKeywordInput(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                                                    placeholder="Add keyword..."
                                                />
                                                <Button type="button" onClick={handleAddKeyword}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Press Enter or click + to add keywords
                                            </p>
                                        </div>

                                        {/* Categories */}
                                        <div>
                                            <Label>Categories</Label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {profileForm.categories.map((category, idx) => (
                                                    <Badge key={idx} variant="secondary" className="gap-1">
                                                        {category}
                                                        <button onClick={() => handleRemoveCategory(category)}>
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={categoryInput}
                                                    onChange={(e) => setCategoryInput(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                                                    placeholder="Add category..."
                                                />
                                                <Button type="button" onClick={handleAddCategory}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Regions */}
                                        <div>
                                            <Label>Regions</Label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {profileForm.regions.map((region, idx) => (
                                                    <Badge key={idx} variant="secondary" className="gap-1">
                                                        {region}
                                                        <button onClick={() => handleRemoveRegion(region)}>
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={regionInput}
                                                    onChange={(e) => setRegionInput(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRegion())}
                                                    placeholder="Add region..."
                                                />
                                                <Button type="button" onClick={handleAddRegion}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Value Range */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="min-value">Min Value (₹)</Label>
                                                <Input
                                                    id="min-value"
                                                    type="number"
                                                    value={profileForm.minValue}
                                                    onChange={(e) => setProfileForm({ ...profileForm, minValue: e.target.value })}
                                                    placeholder="100000"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="max-value">Max Value (₹)</Label>
                                                <Input
                                                    id="max-value"
                                                    type="number"
                                                    value={profileForm.maxValue}
                                                    onChange={(e) => setProfileForm({ ...profileForm, maxValue: e.target.value })}
                                                    placeholder="50000000"
                                                />
                                            </div>
                                        </div>

                                        {/* Auto-Import Threshold */}
                                        <div>
                                            <Label htmlFor="threshold">Auto-Import Threshold (%)</Label>
                                            <Input
                                                id="threshold"
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={profileForm.autoImportThreshold}
                                                onChange={(e) =>
                                                    setProfileForm({ ...profileForm, autoImportThreshold: parseInt(e.target.value) || 0 })
                                                }
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Tenders with relevance ≥ this threshold will be auto-imported
                                            </p>
                                        </div>
                                        {/* Min Save Relevance */}
                                        <div>
                                            <Label htmlFor="min-relevance">Min Relevance to Save (%)</Label>
                                            <Input
                                                id="min-relevance"
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={profileForm.minRelevance}
                                                onChange={(e) =>
                                                    setProfileForm({ ...profileForm, minRelevance: parseInt(e.target.value, 10) || 0 })
                                                }
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Results must reach this score before they are stored in the staging table.
                                            </p>
                                        </div>

                                        {/* Active Toggle */}
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="is-active"
                                                checked={profileForm.isActive}
                                                onCheckedChange={(checked) => setProfileForm({ ...profileForm, isActive: checked })}
                                            />
                                            <Label htmlFor="is-active">Active</Label>
                                        </div>

                                        {/* Save Button */}
                                        <div className="flex justify-end gap-2 mt-6">
                                            <Button variant="outline" onClick={handleCloseProfileForm}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleSaveProfile}>
                                                {editingProfile ? 'Save Changes' : 'Create Profile'}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </TabsContent>

                        {/* Scout Sources Tab */}
                        <TabsContent value="sources" className="space-y-4 mt-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold">Scout Sources</h2>
                            </div>

                            <div className="grid gap-4">
                                {sources.map((source) => (
                                    <Card key={source.id} className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-lg font-semibold">{source.name}</h3>
                                                    <Badge variant={source.isActive ? 'default' : 'secondary'}>
                                                        {source.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    <Badge variant="outline">{source.sourceType}</Badge>
                                                </div>
                                                {source.url && (
                                                    <p className="text-sm text-muted-foreground">{source.url}</p>
                                                )}
                                                {source.lastScrapedAt && (
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Last scraped: {new Date(source.lastScrapedAt).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
