import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Search,
  Upload,
  Download,
  Trash2,
  FileText,
  Video,
  Image,
  File,
  FolderOpen,
  Plus,
  X,
  Eye,
  Star,
  Tag,
  Filter,
  BarChart3,
  Clock,
  HardDrive,
  BookOpen,
  Award,
  Presentation,
  Shield,
  Lightbulb,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Pencil,
  History,
  TrendingUp,
  Grid3X3,
  List,
} from 'lucide-react';
import { collateralApi } from '../lib/api';

// ==================== Type definitions ====================
interface CollateralCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  item_count: number;
}

interface CollateralTag {
  id: number;
  name: string;
  tag_type: 'project' | 'product' | 'general';
  usage_count: number;
}

interface CollateralItem {
  id: number;
  title: string;
  description: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  file_extension: string;
  download_count: number;
  is_featured: boolean;
  uploaded_by_name: string;
  created_at: string;
  updated_at: string;
  current_version: number;
  tags: { id: number; name: string; type: string }[];
}

interface DashboardStats {
  totalItems: number;
  totalStorageMB: number;
  byCategory: { name: string; slug: string; icon: string; count: number }[];
  byFileType: { type_category: string; count: number }[];
  topDownloaded: { id: number; title: string; download_count: number }[];
  recentUploads: CollateralItem[];
}

// ==================== Helper functions ====================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getFileIcon(fileType: string, extension: string) {
  if (fileType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
  if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-green-500" />;
  if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return <Presentation className="h-5 w-5 text-orange-500" />;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <BarChart3 className="h-5 w-5 text-emerald-500" />;
  if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

function getCategoryIcon(iconName: string) {
  const icons: Record<string, any> = {
    'book-open': BookOpen,
    'video': Video,
    'award': Award,
    'presentation': Presentation,
    'file-text': FileText,
    'shield': Shield,
    'lightbulb': Lightbulb,
    'file-search': FileSearch,
    'folder': FolderOpen,
  };
  const IconComponent = icons[iconName] || FolderOpen;
  return <IconComponent className="h-5 w-5" />;
}

// ==================== Sub-components ====================

function UploadDialog({
  isOpen,
  onClose,
  categories,
  tags,
  onUploaded,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: CollateralCategory[];
  tags: CollateralTag[];
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategoryId('');
    setSelectedTags([]);
    setIsFeatured(false);
    setError('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !categoryId) {
      setError('Please fill in title, category, and select a file.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const result = await collateralApi.upload(file, {
        title,
        description,
        categoryId: parseInt(categoryId),
        tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        isFeatured,
      });

      if (result.success) {
        resetForm();
        onUploaded();
        onClose();
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Upload collateral">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Upload Collateral</h2>
          <Button variant="ghost" size="sm" onClick={() => { resetForm(); onClose(); }} aria-label="Close dialog">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragActive ? 'border-indigo-500 bg-indigo-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop file here or click to browse"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.mov,.avi,.webm,.zip"
              aria-hidden="true"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                {getFileIcon(file.type, '')}
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drop file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, PPTX, XLS, Images, Videos, ZIP</p>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="collateral-title">Title *</Label>
            <Input
              id="collateral-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Mobilise Cloud Services Brochure 2026"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="collateral-desc">Description</Label>
            <Textarea
              id="collateral-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this material..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="collateral-category">Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="collateral-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="mt-1 space-y-2">
              {['product', 'project', 'general'].map(type => {
                const typeTags = tags.filter(t => t.tag_type === type);
                if (typeTags.length === 0) return null;
                return (
                  <div key={type}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                      {type === 'product' ? 'Product' : type === 'project' ? 'Project' : 'General'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {typeTags.map(tag => (
                        <Badge
                          key={tag.id}
                          variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Featured toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="collateral-featured"
              checked={isFeatured}
              onChange={e => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="collateral-featured" className="text-sm">Mark as featured</Label>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !title || !categoryId}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== Edit Dialog ====================
function EditDialog({
  item,
  categories,
  tags,
  onClose,
  onSaved,
}: {
  item: CollateralItem;
  categories: CollateralCategory[];
  tags: CollateralTag[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || '');
  const [categoryId, setCategoryId] = useState(String(item.category_id));
  const [selectedTags, setSelectedTags] = useState<number[]>(item.tags.map(t => t.id));
  const [isFeatured, setIsFeatured] = useState(item.is_featured);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadVersions = async () => {
    setLoadingVersions(true);
    try {
      const result = await collateralApi.getVersions(item.id);
      if (result.success && result.data) {
        setVersions(result.data.versions || []);
      }
    } catch (err) {
      console.error('Failed to load versions', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await collateralApi.update(item.id, {
        title,
        description,
        categoryId: parseInt(categoryId),
        tags: selectedTags.join(','),
        isFeatured,
      }, newFile || undefined);
      if (result.success) {
        onSaved();
        onClose();
      } else {
        setError(result.error || 'Update failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Edit Collateral</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-4 space-y-4">
          {/* Current File Info */}
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getFileIcon(item.file_type, item.file_extension)}
                <div>
                  <p className="text-sm font-medium truncate max-w-[250px]">{item.original_name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(item.file_size)} · v{item.current_version || 1}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => { setShowVersions(!showVersions); if (!showVersions && versions.length === 0) loadVersions(); }}
              >
                <History className="h-3 w-3 mr-1" />
                History
              </Button>
            </div>
          </div>

          {/* Version History Panel */}
          {showVersions && (
            <div className="border rounded-lg p-3 bg-blue-50/50">
              <h4 className="text-sm font-medium mb-2">Version History</h4>
              {loadingVersions ? (
                <p className="text-xs text-gray-500">Loading...</p>
              ) : versions.length === 0 ? (
                <p className="text-xs text-gray-500">No previous versions</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {versions.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between text-xs bg-white rounded p-2 border">
                      <div>
                        <span className="font-medium">v{v.version_number}</span>
                        <span className="text-gray-500 ml-2">{v.original_name}</span>
                      </div>
                      <div className="text-gray-400">
                        {formatFileSize(v.file_size)} · {formatDate(v.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Replace File */}
          <div>
            <Label>Replace File (optional)</Label>
            <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {newFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium truncate max-w-[280px]">{newFile.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(newFile.size)})</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setNewFile(null); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Click to select a new file to replace the current one</p>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            {newFile && (
              <p className="text-xs text-amber-600 mt-1">
                Replacing the file will create a new version (v{(item.current_version || 1) + 1})
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea id="edit-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit-featured" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="edit-featured" className="text-sm">Featured</Label>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : newFile ? 'Save & Upload New Version' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== Create Tag Dialog ====================
function CreateTagDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [tagType, setTagType] = useState<'project' | 'product' | 'general'>('general');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await collateralApi.createTag({ name: name.trim(), tagType });
      setName('');
      onCreated();
      onClose();
    } catch (err) {
      // handle silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">New Tag</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <Label htmlFor="tag-name">Tag Name</Label>
            <Input id="tag-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Cloud Migration" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={tagType} onValueChange={(v: any) => setTagType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>Create</Button>
        </div>
      </div>
    </div>
  );
}

// ==================== Item Card ====================
function CollateralCard({
  item,
  onEdit,
  onDelete,
  onDownload,
}: {
  item: CollateralItem;
  onEdit: (item: CollateralItem) => void;
  onDelete: (item: CollateralItem) => void;
  onDownload: (item: CollateralItem) => void;
}) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getFileIcon(item.file_type, item.file_extension)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-sm truncate" title={item.title}>
                {item.is_featured && <Star className="h-3 w-3 text-yellow-500 inline mr-1" />}
                {item.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {item.category_name} &middot; {formatFileSize(item.file_size)} &middot; {item.file_extension?.toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onDownload(item)} title="Download" aria-label={`Download ${item.title}`}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(item)} title="Edit" aria-label={`Edit ${item.title}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => onDelete(item)} title="Delete" aria-label={`Delete ${item.title}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {item.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {item.tags?.map(tag => (
              <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag.type === 'product' ? '🏷' : tag.type === 'project' ? '📁' : '🔖'} {tag.name}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
            <span>{item.uploaded_by_name}</span>
            <span>{formatDate(item.created_at)}</span>
            {item.download_count > 0 && <span>{item.download_count} downloads</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ==================== Main Component ====================

export function CollateralRepository() {
  // Data state
  const [categories, setCategories] = useState<CollateralCategory[]>([]);
  const [tags, setTags] = useState<CollateralTag[]>([]);
  const [items, setItems] = useState<CollateralItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CollateralItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CollateralItem | null>(null);
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== Data loading ====================

  const loadCategories = useCallback(async () => {
    const res = await collateralApi.getCategories();
    if (res.success) setCategories(res.data);
  }, []);

  const loadTags = useCallback(async () => {
    const res = await collateralApi.getTags();
    if (res.success) setTags(res.data);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await collateralApi.getDashboardStats();
    if (res.success) setStats(res.data);
  }, []);

  const loadItems = useCallback(async () => {
    const params: any = { page, pageSize: 20 };
    if (categoryFilter !== 'all') params.categoryId = parseInt(categoryFilter);
    if (tagFilter !== 'all') params.tagId = parseInt(tagFilter);
    if (fileTypeFilter !== 'all') params.fileType = fileTypeFilter;

    const res = await collateralApi.getAll(params);
    if (res.success) {
      setItems(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotalItems(res.data.total);
    }
  }, [page, categoryFilter, tagFilter, fileTypeFilter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCategories(), loadTags(), loadStats(), loadItems()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadTags, loadStats, loadItems]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadItems();
  }, [page, categoryFilter, tagFilter, fileTypeFilter]);

  // ==================== Search ====================

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await collateralApi.search(query);
      if (res.success) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      // handle silently
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(value), 400);
  };

  // ==================== Actions ====================

  const handleDownload = async (item: CollateralItem) => {
    try {
      await collateralApi.download(item.id, item.original_name);
    } catch (err: any) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleDelete = async (item: CollateralItem) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      const res = await collateralApi.delete(item.id);
      if (res.success) {
        loadItems();
        loadStats();
        loadCategories();
      }
    } catch (err) {
      // handle silently
    }
  };

  const handleAfterUpload = () => {
    loadItems();
    loadStats();
    loadCategories();
  };

  // ==================== Render ====================

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading collateral repository...</p>
        </div>
      </div>
    );
  }

  const displayItems = searchResults !== null ? searchResults : items;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collateral Repository</h1>
          <p className="text-sm text-gray-500 mt-1">Marketing materials, brochures, videos & collateral for the team</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsCreateTagOpen(true)}>
            <Tag className="h-4 w-4 mr-1" /> New Tag
          </Button>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload Material
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-10 w-full"
          placeholder="Search across titles, descriptions, tags..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Search collateral"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => { setSearchQuery(''); setSearchResults(null); }}
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {searchResults !== null ? (
        // Search Results View
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {searchLoading ? 'Searching...' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`}
            </p>
            <Button variant="link" size="sm" onClick={() => { setSearchQuery(''); setSearchResults(null); }}>
              Clear search
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map(item => (
              <CollateralCard
                key={item.id}
                item={item}
                onEdit={setEditingItem}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            ))}
          </div>
          {searchResults.length === 0 && !searchLoading && (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No materials found for this search.</p>
            </div>
          )}
        </div>
      ) : (
        // Main Tabbed View
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="browse">Browse All</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>

          {/* ==================== Dashboard Tab ==================== */}
          <TabsContent value="dashboard">
            {stats && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total Items</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalItems}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Categories</p>
                    <p className="text-2xl font-bold mt-1">{categories.length}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Storage Used</p>
                    <p className="text-2xl font-bold mt-1">{stats.totalStorageMB} MB</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Tags</p>
                    <p className="text-2xl font-bold mt-1">{tags.length}</p>
                  </Card>
                </div>

                {/* Category Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">By Category</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stats.byCategory.map(cat => (
                      <Card
                        key={cat.slug}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          const matchedCat = categories.find(c => c.slug === cat.slug);
                          if (matchedCat) {
                            setCategoryFilter(String(matchedCat.id));
                            setActiveTab('browse');
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(cat.icon)}
                          <div>
                            <p className="text-sm font-medium">{cat.name}</p>
                            <p className="text-xs text-gray-500">{cat.count} item{cat.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* File Type Breakdown */}
                {stats.byFileType.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">By File Type</h3>
                    <div className="flex flex-wrap gap-2">
                      {stats.byFileType.map(ft => (
                        <Badge key={ft.type_category} variant="outline" className="px-3 py-1">
                          {ft.type_category}: {ft.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Downloaded */}
                {stats.topDownloaded.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Most Downloaded</h3>
                    <div className="space-y-2">
                      {stats.topDownloaded.map((item, idx) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">
                            <span className="text-gray-400 mr-2">#{idx + 1}</span>
                            {item.title}
                          </span>
                          <Badge variant="outline" className="text-xs">{item.download_count} downloads</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Uploads */}
                {stats.recentUploads.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Uploads</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {stats.recentUploads.slice(0, 6).map(item => (
                        <Card key={item.id} className="p-3">
                          <div className="flex items-center gap-2">
                            {getFileIcon(item.file_type, item.file_extension)}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <p className="text-xs text-gray-500">
                                {item.category_name} &middot; {item.uploaded_by_name} &middot; {formatDate(item.created_at)}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {stats.totalItems === 0 && (
                  <div className="text-center py-16">
                    <FolderOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700">Your collateral repository is empty</h3>
                    <p className="text-sm text-gray-500 mt-1">Upload your first marketing material to get started.</p>
                    <Button className="mt-4" onClick={() => setIsUploadOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" /> Upload Material
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ==================== Browse Tab ==================== */}
          <TabsContent value="browse">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name} ({cat.item_count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={tagFilter} onValueChange={v => { setTagFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={String(tag.id)}>
                      {tag.tag_type === 'product' ? '🏷' : tag.tag_type === 'project' ? '📁' : '🔖'} {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={fileTypeFilter} onValueChange={v => { setFileTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="application/pdf">PDF</SelectItem>
                  <SelectItem value="image/">Images</SelectItem>
                  <SelectItem value="video/">Videos</SelectItem>
                  <SelectItem value="application/vnd.openxmlformats-officedocument.presentationml">Presentations</SelectItem>
                  <SelectItem value="application/vnd.openxmlformats-officedocument.wordprocessingml">Word Docs</SelectItem>
                  <SelectItem value="application/vnd.openxmlformats-officedocument.spreadsheetml">Spreadsheets</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto flex items-center gap-1">
                <span className="text-xs text-gray-500 mr-2">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Items Grid/List */}
            {displayItems.length > 0 ? (
              <>
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'
                  : 'space-y-2'
                }>
                  {displayItems.map(item => (
                    <CollateralCard
                      key={item.id}
                      item={item}
                      onEdit={setEditingItem}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No materials found with these filters.</p>
                <Button variant="link" onClick={() => { setCategoryFilter('all'); setTagFilter('all'); setFileTypeFilter('all'); }}>
                  Clear filters
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ==================== Tags Tab ==================== */}
          <TabsContent value="tags">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Manage Tags</h3>
              <Button size="sm" variant="outline" onClick={() => setIsCreateTagOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> New Tag
              </Button>
            </div>

            {['product', 'project', 'general'].map(type => {
              const typeTags = tags.filter(t => t.tag_type === type);
              if (typeTags.length === 0) return null;
              return (
                <div key={type} className="mb-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {type === 'product' ? 'Product Tags' : type === 'project' ? 'Project Tags' : 'General Tags'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {typeTags.map(tag => (
                      <div key={tag.id} className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                        <span className="text-sm">{tag.name}</span>
                        <Badge variant="outline" className="text-[10px] ml-1">{tag.usage_count}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 text-gray-400 hover:text-red-500"
                          onClick={async () => {
                            if (confirm(`Delete tag "${tag.name}"?`)) {
                              await collateralApi.deleteTag(tag.id);
                              loadTags();
                            }
                          }}
                          aria-label={`Delete tag ${tag.name}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <UploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        categories={categories}
        tags={tags}
        onUploaded={handleAfterUpload}
      />

      {editingItem && (
        <EditDialog
          item={editingItem}
          categories={categories}
          tags={tags}
          onClose={() => setEditingItem(null)}
          onSaved={handleAfterUpload}
        />
      )}

      <CreateTagDialog
        isOpen={isCreateTagOpen}
        onClose={() => setIsCreateTagOpen(false)}
        onCreated={loadTags}
      />
    </div>
  );
}
