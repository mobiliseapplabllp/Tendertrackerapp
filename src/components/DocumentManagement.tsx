import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
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
  User,
  HardDrive,
  Filter,
  Plus,
  X,
} from 'lucide-react';
import { Separator } from './ui/separator';

interface Document {
  id: string;
  name: string;
  category: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedDate: string;
  isFavorite: boolean;
  description: string;
  tags: string[];
  validUntil?: string;
}

const documentCategories = [
  { id: 'tax', name: 'Tax Documents', icon: FileText, color: 'bg-blue-500' },
  { id: 'certificates', name: 'Certifications', icon: File, color: 'bg-green-500' },
  { id: 'company', name: 'Company Documents', icon: FolderOpen, color: 'bg-purple-500' },
  { id: 'legal', name: 'Legal Documents', icon: FileText, color: 'bg-red-500' },
  { id: 'templates', name: 'Templates', icon: File, color: 'bg-orange-500' },
  { id: 'other', name: 'Other', icon: FolderOpen, color: 'bg-gray-500' },
];

export function DocumentManagement() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'GST_Certificate_2024.pdf',
      category: 'tax',
      type: 'PDF',
      size: '2.3 MB',
      uploadedBy: 'John Smith',
      uploadedDate: '2024-11-15',
      isFavorite: true,
      description: 'GST Registration Certificate',
      tags: ['GSTIN', 'Tax', 'Registration'],
      validUntil: '2025-11-15',
    },
    {
      id: '2',
      name: 'PAN_Card_Company.pdf',
      category: 'tax',
      type: 'PDF',
      size: '856 KB',
      uploadedBy: 'Sarah Johnson',
      uploadedDate: '2024-10-20',
      isFavorite: true,
      description: 'Company PAN Card',
      tags: ['PAN', 'Tax', 'Identity'],
    },
    {
      id: '3',
      name: 'ISO_9001_Certificate.pdf',
      category: 'certificates',
      type: 'PDF',
      size: '1.8 MB',
      uploadedBy: 'Mike Davis',
      uploadedDate: '2024-09-10',
      isFavorite: true,
      description: 'ISO 9001:2015 Quality Management Certificate',
      tags: ['ISO', 'Quality', 'Certification'],
      validUntil: '2026-09-10',
    },
    {
      id: '4',
      name: 'Company_Registration_Certificate.pdf',
      category: 'company',
      type: 'PDF',
      size: '1.2 MB',
      uploadedBy: 'John Smith',
      uploadedDate: '2024-08-05',
      isFavorite: false,
      description: 'Certificate of Incorporation',
      tags: ['Registration', 'Legal', 'Company'],
    },
    {
      id: '5',
      name: 'Bank_Details.pdf',
      category: 'company',
      type: 'PDF',
      size: '450 KB',
      uploadedBy: 'Emily Brown',
      uploadedDate: '2024-11-01',
      isFavorite: true,
      description: 'Company Bank Account Details',
      tags: ['Banking', 'Finance'],
    },
    {
      id: '6',
      name: 'Technical_Proposal_Template.docx',
      category: 'templates',
      type: 'DOCX',
      size: '125 KB',
      uploadedBy: 'Sarah Johnson',
      uploadedDate: '2024-10-15',
      isFavorite: false,
      description: 'Standard Technical Proposal Template',
      tags: ['Template', 'Proposal', 'Technical'],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'tax',
    description: '',
    tags: '',
    validUntil: '',
  });

  const handleUpload = () => {
    // In a real app, this would handle file upload to server
    const newDoc: Document = {
      id: `doc_${Date.now()}`,
      name: uploadForm.name,
      category: uploadForm.category,
      type: 'PDF',
      size: '1.5 MB',
      uploadedBy: 'Current User',
      uploadedDate: new Date().toISOString().split('T')[0],
      isFavorite: false,
      description: uploadForm.description,
      tags: uploadForm.tags.split(',').map((t) => t.trim()),
      validUntil: uploadForm.validUntil || undefined,
    };
    setDocuments([newDoc, ...documents]);
    setIsUploadOpen(false);
    setUploadForm({
      name: '',
      category: 'tax',
      description: '',
      tags: '',
      validUntil: '',
    });
  };

  const handleToggleFavorite = (docId: string) => {
    setDocuments(
      documents.map((doc) =>
        doc.id === docId ? { ...doc, isFavorite: !doc.isFavorite } : doc
      )
    );
  };

  const handleDelete = (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter((doc) => doc.id !== docId));
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const favoriteDocuments = documents.filter((doc) => doc.isFavorite);

  const getCategoryInfo = (categoryId: string) => {
    return documentCategories.find((cat) => cat.id === categoryId);
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

  const getDocumentsByCategory = (categoryId: string) => {
    return documents.filter((doc) => doc.category === categoryId);
  };

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
          {/* Upload Form */}
          {isUploadOpen && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload New Document
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsUploadOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Document File *</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-indigo-600 transition-colors cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX, XLS, XLSX (Max 10MB)
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                      value={uploadForm.category}
                      onValueChange={(value) =>
                        setUploadForm({ ...uploadForm, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="flex gap-2">
                  <Button onClick={handleUpload}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Storage Info */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm">Storage Used</p>
                  <p className="text-xs text-muted-foreground">
                    {documents.length} documents
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg">24.8 MB</p>
                <p className="text-xs text-muted-foreground">of 1 GB</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600"
                style={{ width: '2.48%' }}
              />
            </div>
          </Card>

          {/* Category Overview */}
          <div className="grid grid-cols-3 gap-4">
            {documentCategories.map((category) => {
              const Icon = category.icon;
              const count = getDocumentsByCategory(category.id).length;
              return (
                <Card
                  key={category.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setCategoryFilter(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center`}
                      >
                        <Icon className="w-5 h-5 text-white" />
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

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="favorites">
                Favorites ({favoriteDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
            </TabsList>

            {/* All Documents Tab */}
            <TabsContent value="all" className="space-y-4 mt-4">
              {/* Search and Filter */}
              <Card className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search documents by name, description, or tags..."
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
                      {documentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              {/* Documents Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No documents found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc) => {
                        const categoryInfo = getCategoryInfo(doc.category);
                        return (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {getDocumentIcon(doc.type)}
                                <div>
                                  <p className="flex items-center gap-2">
                                    {doc.name}
                                    {doc.isFavorite && (
                                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {doc.description}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {categoryInfo && (
                                <Badge
                                  className="text-white"
                                  style={{
                                    backgroundColor: categoryInfo.color.replace(
                                      'bg-',
                                      ''
                                    ),
                                  }}
                                >
                                  {categoryInfo.name}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {doc.tags.slice(0, 2).map((tag, idx) => (
                                  <Badge
                                    key={idx}
                                    className="bg-gray-100 text-gray-800 text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.tags.length > 2 && (
                                  <Badge className="bg-gray-100 text-gray-800 text-xs">
                                    +{doc.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{doc.size}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{doc.uploadedDate}</p>
                                <p className="text-xs text-muted-foreground">
                                  by {doc.uploadedBy}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {doc.validUntil ? (
                                <div>
                                  <p className="text-sm">{doc.validUntil}</p>
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
                                <span className="text-sm text-muted-foreground">
                                  N/A
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
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
                                <Button variant="ghost" size="icon" title="View">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4 text-blue-600" />
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
                      const categoryInfo = getCategoryInfo(doc.category);
                      return (
                        <Card key={doc.id} className="p-4 hover:shadow-md">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getDocumentIcon(doc.type)}
                              <div>
                                <p className="text-sm">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.size}
                                </p>
                              </div>
                            </div>
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {doc.description}
                          </p>
                          <div className="flex items-center justify-between">
                            {categoryInfo && (
                              <Badge className="text-xs bg-gray-100 text-gray-800">
                                {categoryInfo.name}
                              </Badge>
                            )}
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Eye className="w-3 h-3" />
                              </Button>
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
                    isExpiringSoon(doc.validUntil) || isExpired(doc.validUntil)
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
                          isExpiringSoon(doc.validUntil) ||
                          isExpired(doc.validUntil)
                      )
                      .map((doc) => {
                        const categoryInfo = getCategoryInfo(doc.category);
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {getDocumentIcon(doc.type)}
                              <div>
                                <p className="flex items-center gap-2">
                                  {doc.name}
                                  {isExpired(doc.validUntil) && (
                                    <Badge className="bg-red-100 text-red-800">
                                      Expired
                                    </Badge>
                                  )}
                                  {isExpiringSoon(doc.validUntil) &&
                                    !isExpired(doc.validUntil) && (
                                      <Badge className="bg-orange-100 text-orange-800">
                                        Expiring Soon
                                      </Badge>
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Valid until: {doc.validUntil}
                                </p>
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
    </div>
  );
}
