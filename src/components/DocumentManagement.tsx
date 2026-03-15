import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  FolderOpen,
  Upload,
  FileText,
  File,
  Download,
  Trash2,
  Search,
  Star,
  StarOff,
  Eye,
  Calendar,
  HardDrive,
  Filter,
  Plus,
  X,
  Save,
  Heart,
  Clock,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { documentApi } from '../lib/api';
import type { Document } from '../lib/types';

// ESC key handler component
function EscKeyHandler({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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

  return null;
}

export function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    categoryId: '',
    description: '',
    validUntil: '',
  });

  const [uploadForm, setUploadForm] = useState({
    name: '',
    categoryId: '',
    description: '',
    tags: '',
    validUntil: '',
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch documents and categories from API
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch documents when filters or pagination change
  useEffect(() => {
    fetchDocuments();
  }, [page, pageSize, searchQuery, categoryFilter]);

  // Note: Categories are loaded and checked in fetchCategories

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build filters for API call
      const filters: any = {
        page,
        pageSize,
        excludeTenderDocuments: true,
      };

      // Add search filter if provided
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      // Add category filter if not 'all'
      if (categoryFilter !== 'all') {
        filters.categoryId = categoryFilter;
      }

      const response = await documentApi.getAll(filters);
      if (response.success && response.data) {
        // Transform snake_case to camelCase
        const transformedDocs = (response.data.data || []).map((doc: any) => ({
            id: doc.id,
            tenderId: doc.tender_id,
            categoryId: doc.category_id,
            fileName: doc.file_name,
            originalName: doc.original_name,
            documentName: doc.document_name || doc.original_name, // Use document_name if available, fallback to original_name
            description: doc.description,
            filePath: doc.file_path,
            fileSize: doc.file_size,
            mimeType: doc.mime_type,
            fileHash: doc.file_hash,
            expirationDate: doc.expiration_date,
            isFavorite: doc.is_favorite === 1 || doc.is_favorite === true,
            uploadedBy: doc.uploaded_by,
            uploadedAt: doc.uploaded_at,
            uploadedByName: doc.uploaded_by_name,
          }));
        setDocuments(transformedDocs);
        setTotalPages(response.data.totalPages || 1);
        setTotal(response.data.total || 0);
      } else {
        setError(response.error || 'Failed to load documents');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await documentApi.getCategories();
      if (response.success && response.data) {
        const categoriesData = response.data || [];
        setCategories(categoriesData);
        if (categoriesData.length === 0) {
          setError('No document categories available. Please contact administrator to add categories.');
        }
      } else {
        setError(`Failed to load categories: ${response.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(`Failed to load categories: ${err.message || 'Unknown error'}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.name || !uploadForm.categoryId) {
      setError('Please select a file and fill in required fields');
      return;
    }

    try {
      const response = await documentApi.upload(selectedFile, {
        name: uploadForm.name,
        categoryId: parseInt(uploadForm.categoryId),
        description: uploadForm.description || null,
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()) : [],
        validUntil: uploadForm.validUntil || null,
      });

      if (response.success) {
        await fetchDocuments();
        setIsUploadOpen(false);
        setSelectedFile(null);
        setUploadForm({
          name: '',
          categoryId: '',
          description: '',
          tags: '',
          validUntil: '',
        });
        setError(null);
      } else {
        setError(response.error || 'Failed to upload document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    }
  };

  const handleToggleFavorite = async (docId: number) => {
    try {
      const response = await documentApi.toggleFavorite(docId);
      if (response.success) {
        await fetchDocuments();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update favorite status');
    }
  };

  const handleViewDocument = async (docId: number) => {
    try {
      await documentApi.view(docId);
    } catch (err: any) {
      setError(err.message || 'Failed to view document');
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await documentApi.delete(docId);
      if (response.success) {
        await fetchDocuments();
      } else {
        setError(response.error || 'Failed to delete document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const handleEditDocument = (doc: Document) => {
    setEditingDocument(doc);
    setEditForm({
      name: doc.documentName || doc.originalName || '',
      categoryId: doc.categoryId?.toString() || '',
      description: doc.description || '',
      validUntil: doc.expirationDate ? new Date(doc.expirationDate).toISOString().split('T')[0] : '',
    });
    setError(null);
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;

    try {
      const response = await documentApi.update(editingDocument.id, {
        name: editForm.name || null,
        description: editForm.description || null,
        categoryId: editForm.categoryId ? parseInt(editForm.categoryId) : null,
        expirationDate: editForm.validUntil || null,
      });

      if (response.success) {
        await fetchDocuments();
        setEditingDocument(null);
        setEditForm({
          name: '',
          categoryId: '',
          description: '',
          validUntil: '',
        });
        setError(null);
      } else {
        setError(response.error || 'Failed to update document');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update document');
    }
  };

  // Documents are already filtered by the API, so we use them directly
  // Only apply client-side filtering for favorites and expiring tabs
  const filteredDocuments = documents;

  const favoriteDocuments = documents.filter((doc) => doc.isFavorite);

  const getCategoryInfo = (categoryId?: number) => {
    if (!categoryId) return null;
    return categories.find((cat) => cat.id === categoryId);
  };

  const getDocumentIcon = (type: string) => {
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const isExpiringSoon = (validUntil?: string) => {
    if (!validUntil) return false;
    const today = new Date();
    const expiryDate = new Date(validUntil);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isExpired = (validUntil?: string) => {
    if (!validUntil) return false;
    const today = new Date();
    const expiryDate = new Date(validUntil);
    return expiryDate < today;
  };

  const getDocumentsByCategory = (categoryId: number) => {
    return documents.filter((doc) => doc.categoryId === categoryId);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl flex items-center gap-2">
            <FolderOpen className="w-6 h-6" />
            Document Management
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <FolderOpen className="w-6 h-6" />
              Document Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload and manage frequently used documents
            </p>
          </div>
          <Button onClick={() => setIsUploadOpen(!isUploadOpen)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-800 text-sm">{error}</p>
            </Card>
          )}

          {/* Upload Form - removed inline, now in drawer */}


          {/* Category Overview */}
          {categories.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {categories.map((category) => {
                const count = getDocumentsByCategory(category.id).length;
                return (
                  <Card
                    key={category.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setCategoryFilter(category.id.toString())}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {count} documents
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">
                <FileText className="w-4 h-4" />
                All Documents
              </TabsTrigger>
              <TabsTrigger value="favorites">
                <Heart className="w-4 h-4" />
                Favorites ({favoriteDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="expiring">
                <Clock className="w-4 h-4" />
                Expiring Soon
              </TabsTrigger>
            </TabsList>

            {/* All Documents Tab */}
            <TabsContent value="all" className="space-y-4 mt-4">
              {/* Search and Filter */}
              <Card className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search documents by name or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger className="w-[200px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              {/* Documents Table */}
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                          <p className="mt-2">Loading documents...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredDocuments.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-muted-foreground"
                            >
                          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No documents found</p>
                          {searchQuery && (
                            <p className="text-sm mt-1">Try adjusting your search or filters</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc) => {
                        const categoryInfo = getCategoryInfo(doc.categoryId);
                        return (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <p className="flex items-center gap-2 font-medium">
                                {doc.documentName || doc.originalName || doc.fileName || 'Untitled Document'}
                                {doc.isFavorite && (
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                )}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">
                                {doc.description || '-'}
                              </p>
                            </TableCell>
                            <TableCell>
                              {categoryInfo ? (
                                <Badge className="bg-indigo-100 text-indigo-800">
                                  {categoryInfo.name}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                            <TableCell>
                              {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {doc.validUntil ? (
                                <div>
                                  <p className="text-sm">{new Date(doc.validUntil).toLocaleDateString()}</p>
                                  {isExpired(doc.validUntil) && (
                                    <Badge className="bg-red-100 text-red-800 text-xs mt-1">
                                      Expired
                                    </Badge>
                                  )}
                                  {isExpiringSoon(doc.validUntil) &&
                                    !isExpired(doc.validUntil) && (
                                      <Badge className="bg-orange-100 text-orange-800 text-xs mt-1">
                                        Expiring Soon
                                      </Badge>
                                    )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditDocument(doc)}
                                  title="Edit Document"
                                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleFavorite(doc.id)}
                                  title={
                                    doc.isFavorite
                                      ? 'Remove from favorites'
                                      : 'Add to favorites'
                                  }
                                >
                                  {doc.isFavorite ? (
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  ) : (
                                    <StarOff className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewDocument(doc.id)}
                                  title="View Document"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadDocument(doc.id, doc.originalName)}
                                  title="Download Document"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(doc.id)}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </div>
                
                {/* Pagination Controls */}
                {!loading && total > 0 && (
                  <div className="border-t px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} documents
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="page-size" className="text-sm">Per page:</Label>
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(value) => {
                            setPageSize(parseInt(value));
                            setPage(1); // Reset to first page when changing page size
                          }}
                        >
                          <SelectTrigger id="page-size" className="w-20 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(prev => Math.max(1, prev - 1))}
                        disabled={page === 1 || loading}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              className="w-10"
                              onClick={() => setPage(pageNum)}
                              disabled={loading}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      {totalPages > 5 && (
                        <span className="px-2 text-sm text-muted-foreground">...</span>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={page === totalPages || loading}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites" className="space-y-4 mt-4">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  Frequently Used Documents
                </h3>
                {favoriteDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No favorite documents yet</p>
                    <p className="text-sm mt-1">
                      Click the star icon to add documents to favorites
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {favoriteDocuments.map((doc) => {
                      const categoryInfo = getCategoryInfo(doc.categoryId);
                      return (
                        <Card key={doc.id} className="p-4 hover:shadow-md">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getDocumentIcon(doc.fileType || 'PDF')}
                              <div>
                                <p className="text-sm">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(doc.fileSize)}
                                </p>
                              </div>
                            </div>
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          </div>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground mb-3">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            {categoryInfo && (
                              <Badge className="text-xs bg-gray-100 text-gray-800">
                                {categoryInfo.name}
                              </Badge>
                            )}
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Download className="w-3 h-3 text-blue-600" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Expiring Soon Tab */}
            <TabsContent value="expiring" className="space-y-4 mt-4">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Documents Expiring Soon
                </h3>
                {documents.filter(
                  (doc) =>
                    doc.validUntil && (isExpiringSoon(doc.validUntil) || isExpired(doc.validUntil))
                ).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No expiring documents</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents
                      .filter(
                        (doc) =>
                          doc.validUntil && (isExpiringSoon(doc.validUntil) || isExpired(doc.validUntil))
                      )
                      .map((doc) => {
                        const categoryInfo = getCategoryInfo(doc.categoryId);
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {getDocumentIcon(doc.fileType || 'PDF')}
                              <div>
                                <p className="flex items-center gap-2">
                                  {doc.name}
                                  {isExpired(doc.validUntil) && (
                                    <Badge className="bg-red-100 text-red-800">
                                      Expired
                                    </Badge>
                                  )}
                                  {doc.validUntil && isExpiringSoon(doc.validUntil) &&
                                    !isExpired(doc.validUntil) && (
                                      <Badge className="bg-orange-100 text-orange-800">
                                        Expiring Soon
                                      </Badge>
                                    )}
                                </p>
                                {doc.validUntil && (
                                  <p className="text-xs text-muted-foreground">
                                    Valid until: {new Date(doc.validUntil).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                Renew
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Upload Document Drawer */}
      {isUploadOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setIsUploadOpen(false)}
          />
          <EscKeyHandler isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-[80%] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">Upload New Document</h2>
                  <p className="text-sm text-muted-foreground">Upload a document to the system</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleUpload}>
                  <Save className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsUploadOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Document File *</Label>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-indigo-600 transition-colors">
                        <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOC, DOCX, XLS, XLSX (Max 10MB)
                        </p>
                        {selectedFile && (
                          <p className="text-sm mt-2 text-indigo-600 font-medium">{selectedFile.name}</p>
                        )}
                      </div>
                    </label>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Document Name *</Label>
                      <Input
                        placeholder="e.g., GST Certificate 2024"
                        value={uploadForm.name}
                        onChange={(e) =>
                          setUploadForm({ ...uploadForm, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        value={uploadForm.categoryId}
                        onValueChange={(value) =>
                          setUploadForm({ ...uploadForm, categoryId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.length > 0 ? (
                            categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No categories available. Please ensure categories are seeded in the database.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Brief description of the document"
                      value={uploadForm.description}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Tags (comma separated)</Label>
                      <Input
                        placeholder="e.g., GSTIN, Tax, Registration"
                        value={uploadForm.tags}
                        onChange={(e) =>
                          setUploadForm({ ...uploadForm, tags: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valid Until (Optional)</Label>
                      <Input
                        type="date"
                        value={uploadForm.validUntil}
                        onChange={(e) =>
                          setUploadForm({ ...uploadForm, validUntil: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Edit Document Drawer */}
      {editingDocument && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => {
              setEditingDocument(null);
              setEditForm({
                name: '',
                categoryId: '',
                description: '',
                validUntil: '',
              });
              setError(null);
            }}
          />
          <EscKeyHandler
            isOpen={!!editingDocument}
            onClose={() => {
              setEditingDocument(null);
              setEditForm({
                name: '',
                categoryId: '',
                description: '',
                validUntil: '',
              });
              setError(null);
            }}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-[80%] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Edit Document</h2>
                  <p className="text-sm text-muted-foreground">
                    {editingDocument.documentName || editingDocument.originalName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleUpdateDocument}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingDocument(null);
                    setEditForm({
                      name: '',
                      categoryId: '',
                      description: '',
                      validUntil: '',
                    });
                    setError(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4 max-w-2xl">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Document Name *</Label>
                    <Input
                      id="edit-name"
                      placeholder="e.g., GST Certificate 2024"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category *</Label>
                    <Select
                      value={editForm.categoryId}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, categoryId: value })
                      }
                    >
                      <SelectTrigger id="edit-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      placeholder="Brief description of the document"
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({ ...editForm, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-validUntil">Valid Until</Label>
                    <Input
                      id="edit-validUntil"
                      type="date"
                      value={editForm.validUntil}
                      onChange={(e) =>
                        setEditForm({ ...editForm, validUntil: e.target.value })
                      }
                    />
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-muted-foreground">
                      <strong>File:</strong> {editingDocument.originalName || editingDocument.fileName}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Size:</strong> {formatFileSize(editingDocument.fileSize)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Uploaded:</strong>{' '}
                      {editingDocument.uploadedAt
                        ? new Date(editingDocument.uploadedAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}

