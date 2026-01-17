import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tag, Plus, Edit, Trash2, Palette, X, Save, FolderTree, FileText } from 'lucide-react';
import { categoryApi, tagApi, documentApi } from '../lib/api';
import type { TenderCategory, TenderTag, DocumentCategory } from '../lib/types';

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

export function CategoryManagement() {
  const [categories, setCategories] = useState<TenderCategory[]>([]);
  const [tags, setTags] = useState<TenderTag[]>([]);
  const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [isAddDocCategoryOpen, setIsAddDocCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TenderCategory | null>(null);
  const [editingTag, setEditingTag] = useState<TenderTag | null>(null);
  const [editingDocCategory, setEditingDocCategory] = useState<DocumentCategory | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#3b82f6',
    description: '',
  });

  const [tagForm, setTagForm] = useState({
    name: '',
  });

  const [docCategoryForm, setDocCategoryForm] = useState({
    name: '',
    description: '',
    icon: '',
  });

  const colorOptions = [
    '#3b82f6', // blue
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // orange
    '#ef4444', // red
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
  ];

  // Fetch categories and tags from API
  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchDocumentCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await categoryApi.getAll();
      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        setError(response.error || 'Failed to load categories');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagApi.getAll();
      if (response.success && response.data) {
        setTags(response.data);
      } else {
        console.error('Failed to load tags:', response.error);
      }
    } catch (err: any) {
      console.error('Failed to load tags:', err);
    }
  };

  const fetchDocumentCategories = async () => {
    try {
      const response = await documentApi.getCategories();
      if (response.success && response.data) {
        // Transform snake_case to camelCase
        const transformed = response.data.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          isSystem: cat.is_system || false,
          createdAt: cat.created_at,
        }));
        setDocumentCategories(transformed);
      } else {
        console.error('Failed to load document categories:', response.error);
      }
    } catch (err: any) {
      console.error('Failed to load document categories:', err);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name) {
      setError('Category name is required');
      return;
    }

    try {
      setError(null);
      let response;
      if (editingCategory) {
        // Update existing category
        response = await categoryApi.update(editingCategory.id, {
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          color: categoryForm.color,
        });
      } else {
        // Create new category
        response = await categoryApi.create({
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          color: categoryForm.color,
        });
      }

      if (response.success) {
        await fetchCategories();
        setIsAddCategoryOpen(false);
        setEditingCategory(null);
        setCategoryForm({ name: '', color: '#3b82f6', description: '' });
      } else {
        setError(response.error || `Failed to ${editingCategory ? 'update' : 'create'} category`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${editingCategory ? 'update' : 'create'} category`);
    }
  };

  const handleEditCategory = (category: TenderCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      color: category.color || '#3b82f6',
      description: category.description || '',
    });
    setIsAddCategoryOpen(true);
  };

  const handleAddTag = async () => {
    if (!tagForm.name) {
      setError('Tag name is required');
      return;
    }

    try {
      setError(null);
      let response;
      if (editingTag) {
        // Update existing tag
        response = await tagApi.update(editingTag.id, {
          name: tagForm.name,
        });
      } else {
        // Create new tag
        response = await tagApi.create({
          name: tagForm.name,
        });
      }

      if (response.success) {
        await fetchTags();
        setIsAddTagOpen(false);
        setEditingTag(null);
        setTagForm({ name: '' });
      } else {
        setError(response.error || `Failed to ${editingTag ? 'update' : 'create'} tag`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${editingTag ? 'update' : 'create'} tag`);
    }
  };

  const handleEditTag = (tag: TenderTag) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
    });
    setIsAddTagOpen(true);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      setError(null);
      const response = await categoryApi.delete(id);
      if (response.success) {
        await fetchCategories();
      } else {
        setError(response.error || 'Failed to delete category');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) {
      return;
    }

    try {
      setError(null);
      const response = await tagApi.delete(id);
      if (response.success) {
        await fetchTags();
      } else {
        setError(response.error || 'Failed to delete tag');
      }
    } catch (err: any) {
      console.error('Error in Delete Tag:', err);
      // Check if it's a connection error
      if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_CONNECTION_REFUSED')) {
        setError('Backend server is not running. Please start the backend server and try again.');
      } else {
        setError(err.message || 'Failed to delete tag');
      }
    }
  };

  const handleAddDocCategory = async () => {
    if (!docCategoryForm.name) {
      setError('Category name is required');
      return;
    }

    try {
      setError(null);
      if (editingDocCategory) {
        const response = await documentApi.updateCategory(editingDocCategory.id, {
          name: docCategoryForm.name,
          description: docCategoryForm.description || undefined,
          icon: docCategoryForm.icon || undefined,
        });
        if (response.success) {
          await fetchDocumentCategories();
          setIsAddDocCategoryOpen(false);
          setEditingDocCategory(null);
          setDocCategoryForm({ name: '', description: '', icon: '' });
        } else {
          setError(response.error || 'Failed to update category');
        }
      } else {
        const response = await documentApi.createCategory({
          name: docCategoryForm.name,
          description: docCategoryForm.description || undefined,
          icon: docCategoryForm.icon || undefined,
        });
        if (response.success) {
          await fetchDocumentCategories();
          setIsAddDocCategoryOpen(false);
          setDocCategoryForm({ name: '', description: '', icon: '' });
        } else {
          setError(response.error || 'Failed to create category');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    }
  };

  const handleDeleteDocCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document category?')) {
      return;
    }

    try {
      setError(null);
      const response = await documentApi.deleteCategory(id);
      if (response.success) {
        await fetchDocumentCategories();
      } else {
        setError(response.error || 'Failed to delete category');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <Tag className="w-6 h-6" />
              Categories & Tags
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize tenders with categories and custom tags
            </p>
          </div>
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

          <Tabs defaultValue="categories" className="w-full">
            <TabsList>
              <TabsTrigger value="categories">
                <FolderTree className="w-4 h-4" />
                Tender Categories
              </TabsTrigger>
              <TabsTrigger value="documentCategories">
                <FileText className="w-4 h-4" />
                Document Categories
              </TabsTrigger>
              <TabsTrigger value="tags">
                <Tag className="w-4 h-4" />
                Tags
              </TabsTrigger>
            </TabsList>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl">Categories</h2>
                <Button onClick={() => setIsAddCategoryOpen(!isAddCategoryOpen)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              {categories.length === 0 ? (
                <Card className="p-8 text-center">
                  <FolderTree className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No categories created yet</p>
                  <Button
                    variant="link"
                    onClick={() => setIsAddCategoryOpen(true)}
                    className="mt-2"
                  >
                    Create your first category
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <p className="text-lg">{category.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <Badge
                        className="bg-gray-100 text-gray-800"
                        style={{
                          backgroundColor: `${category.color}20`,
                          color: category.color,
                        }}
                      >
                        {category.tenderCount} tenders
                      </Badge>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl">Tags</h2>
                <Button onClick={() => setIsAddTagOpen(!isAddTagOpen)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tag
                </Button>
              </div>

              {tags.length === 0 ? (
                <Card className="p-8 text-center">
                  <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No tags created yet</p>
                  <Button
                    variant="link"
                    onClick={() => setIsAddTagOpen(true)}
                    className="mt-2"
                  >
                    Create your first tag
                  </Button>
                </Card>
              ) : (
                <>
                  <Card className="p-6">
                    <div className="grid grid-cols-4 gap-3">
                      {tags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              <p className="text-sm">{tag.name}</p>
                            </div>
                            <Badge className="mt-1 text-xs bg-gray-100 text-gray-800">
                              Used {(tag as any).usageCount || 0}×
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTag(tag)}
                              className="h-6 w-6"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTag(tag.id)}
                              className="h-6 w-6"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Usage Statistics */}
                  <Card className="p-6">
                    <h3 className="mb-4">Tag Usage Statistics</h3>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Most frequently used tags this month
                      </p>
                      {tags
                        .sort((a, b) => b.usageCount - a.usageCount)
                        .slice(0, 5)
                        .map((tag, index) => (
                          <div
                            key={tag.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">#{index + 1}</span>
                              <Tag className="w-4 h-4 text-indigo-600" />
                              <div>
                                <p>{tag.name}</p>
                              </div>
                            </div>
                            <Badge className="bg-indigo-100 text-indigo-800">
                              {tag.usageCount} uses
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Document Categories Tab */}
            <TabsContent value="documentCategories" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl">Document Categories</h2>
                <Button onClick={() => setIsAddDocCategoryOpen(!isAddDocCategoryOpen)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document Category
                </Button>
              </div>

              {documentCategories.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No document categories created yet</p>
                  <Button
                    variant="link"
                    onClick={() => setIsAddDocCategoryOpen(true)}
                    className="mt-2"
                  >
                    Create your first document category
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {documentCategories.map((category) => (
                    <Card key={category.id} className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {category.icon && (
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-indigo-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold">{category.name}</h3>
                            {category.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {category.description}
                              </p>
                            )}
                            {category.isSystem && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!category.isSystem && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingDocCategory(category);
                                setDocCategoryForm({
                                  name: category.name,
                                  description: category.description || '',
                                  icon: category.icon || '',
                                });
                                setIsAddDocCategoryOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDocCategory(category.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Category Form Drawer */}
      {isAddCategoryOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => {
              setIsAddCategoryOpen(false);
              setEditingCategory(null);
              setCategoryForm({ name: '', color: '#3b82f6', description: '' });
            }}
          />
          <EscKeyHandler
            isOpen={isAddCategoryOpen}
            onClose={() => {
              setIsAddCategoryOpen(false);
              setEditingCategory(null);
              setCategoryForm({ name: '', color: '#3b82f6', description: '' });
            }}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white z-50 shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">{editingCategory ? 'Edit Category' : 'Create New Category'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {editingCategory ? 'Update category details' : 'Add a new category to organize tenders'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleAddCategory}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsAddCategoryOpen(false);
                    setEditingCategory(null);
                    setCategoryForm({ name: '', color: '#3b82f6', description: '' });
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
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Category Name *</Label>
                    <Input
                      placeholder="e.g., Infrastructure"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Brief description of this category"
                      value={categoryForm.description}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Color
                    </Label>
                    <div className="flex gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          onClick={() =>
                            setCategoryForm({ ...categoryForm, color })
                          }
                          className={`w-10 h-10 rounded-lg border-2 ${categoryForm.color === color
                            ? 'border-gray-900'
                            : 'border-transparent'
                            }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Tag Form Drawer */}
      {isAddTagOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => {
              setIsAddTagOpen(false);
              setEditingTag(null);
              setTagForm({ name: '' });
            }}
          />
          <EscKeyHandler
            isOpen={isAddTagOpen}
            onClose={() => {
              setIsAddTagOpen(false);
              setEditingTag(null);
              setTagForm({ name: '' });
            }}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white z-50 shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">{editingTag ? 'Edit Tag' : 'Create New Tag'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {editingTag ? 'Update tag details' : 'Add a new tag to categorize tenders'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleAddTag}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingTag ? 'Update Tag' : 'Create Tag'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsAddTagOpen(false);
                    setEditingTag(null);
                    setTagForm({ name: '' });
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
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Tag Name *</Label>
                    <Input
                      placeholder="e.g., Urgent"
                      value={tagForm.name}
                      onChange={(e) =>
                        setTagForm({ ...tagForm, name: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Document Category Form Drawer */}
      {isAddDocCategoryOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              setIsAddDocCategoryOpen(false);
              setEditingDocCategory(null);
              setDocCategoryForm({ name: '', description: '', icon: '' });
            }}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white z-50 shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">
                    {editingDocCategory ? 'Edit Document Category' : 'Add Document Category'}
                  </h2>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAddDocCategoryOpen(false);
                  setEditingDocCategory(null);
                  setDocCategoryForm({ name: '', description: '', icon: '' });
                }}
              >
                <X className="w-5 h-5" />
              </Button>
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
                    <Label>Category Name *</Label>
                    <Input
                      placeholder="e.g., Tax Documents"
                      value={docCategoryForm.name}
                      onChange={(e) =>
                        setDocCategoryForm({ ...docCategoryForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Brief description of the category"
                      value={docCategoryForm.description}
                      onChange={(e) =>
                        setDocCategoryForm({ ...docCategoryForm, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icon Name (optional)</Label>
                    <Input
                      placeholder="e.g., FileText, Award, Building2"
                      value={docCategoryForm.icon}
                      onChange={(e) =>
                        setDocCategoryForm({ ...docCategoryForm, icon: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Use Lucide icon names (e.g., FileText, Award, Building2)
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDocCategoryOpen(false);
                  setEditingDocCategory(null);
                  setDocCategoryForm({ name: '', description: '', icon: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddDocCategory}>
                <Save className="w-4 h-4 mr-2" />
                {editingDocCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
