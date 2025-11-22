import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tag, Plus, Edit, Trash2, Palette } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
  description: string;
  tenderCount: number;
}

interface TagItem {
  id: string;
  name: string;
  category: string;
  usageCount: number;
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
      name: 'Infrastructure',
      color: '#3b82f6',
      description: 'Roads, bridges, and public works projects',
      tenderCount: 35,
    },
    {
      id: '2',
      name: 'Healthcare',
      color: '#10b981',
      description: 'Medical facilities and healthcare IT',
      tenderCount: 22,
    },
    {
      id: '3',
      name: 'Technology',
      color: '#8b5cf6',
      description: 'IT systems, software, and hardware',
      tenderCount: 18,
    },
    {
      id: '4',
      name: 'Transportation',
      color: '#f59e0b',
      description: 'Aviation, railways, and public transit',
      tenderCount: 28,
    },
  ]);

  const [tags, setTags] = useState<TagItem[]>([
    { id: '1', name: 'Urgent', category: 'Priority', usageCount: 45 },
    { id: '2', name: 'High Value', category: 'Value', usageCount: 32 },
    { id: '3', name: 'Government', category: 'Client Type', usageCount: 67 },
    { id: '4', name: 'Private Sector', category: 'Client Type', usageCount: 89 },
    { id: '5', name: 'Recurring', category: 'Type', usageCount: 23 },
    { id: '6', name: 'One-time', category: 'Type', usageCount: 133 },
  ]);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#3b82f6',
    description: '',
  });

  const [tagForm, setTagForm] = useState({
    name: '',
    category: '',
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

  const handleAddCategory = () => {
    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      ...categoryForm,
      tenderCount: 0,
    };
    setCategories([...categories, newCategory]);
    setIsAddCategoryOpen(false);
    setCategoryForm({ name: '', color: '#3b82f6', description: '' });
  };

  const handleAddTag = () => {
    const newTag: TagItem = {
      id: `tag_${Date.now()}`,
      ...tagForm,
      usageCount: 0,
    };
    setTags([...tags, newTag]);
    setIsAddTagOpen(false);
    setTagForm({ name: '', category: '' });
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter((c) => c.id !== id));
    }
  };

  const handleDeleteTag = (id: string) => {
    if (confirm('Are you sure you want to delete this tag?')) {
      setTags(tags.filter((t) => t.id !== id));
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
          {/* Categories Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Categories</h2>
              <Button onClick={() => setIsAddCategoryOpen(!isAddCategoryOpen)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            {isAddCategoryOpen && (
              <Card className="p-6">
                <h3 className="mb-4">Create New Category</h3>
                <div className="space-y-4">
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
                          className={`w-10 h-10 rounded-lg border-2 ${
                            categoryForm.color === color
                              ? 'border-gray-900'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddCategory}>Create Category</Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddCategoryOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

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
                      <Button variant="ghost" size="icon">
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
          </div>

          {/* Tags Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Tags</h2>
              <Button onClick={() => setIsAddTagOpen(!isAddTagOpen)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tag
              </Button>
            </div>

            {isAddTagOpen && (
              <Card className="p-6">
                <h3 className="mb-4">Create New Tag</h3>
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label>Tag Category *</Label>
                    <Input
                      placeholder="e.g., Priority"
                      value={tagForm.category}
                      onChange={(e) =>
                        setTagForm({ ...tagForm, category: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleAddTag}>Create Tag</Button>
                  <Button variant="outline" onClick={() => setIsAddTagOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}

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
                      <p className="text-xs text-muted-foreground">
                        {tag.category}
                      </p>
                      <Badge className="mt-1 text-xs bg-gray-100 text-gray-800">
                        Used {tag.usageCount}×
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="h-6 w-6"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

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
                        <p className="text-sm text-muted-foreground">
                          {tag.category}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-800">
                      {tag.usageCount} uses
                    </Badge>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
