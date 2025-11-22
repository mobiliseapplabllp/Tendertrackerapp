import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tender } from '../lib/mockData';
import { X, FileText, Save } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface CreateTenderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (tender: Tender) => void;
}

export function CreateTenderDialog({
  isOpen,
  onClose,
  onCreate,
}: CreateTenderDialogProps) {
  const [formData, setFormData] = useState({
    tenderNumber: '',
    title: '',
    description: '',
    status: 'open' as Tender['status'],
    dueDate: '',
    estimatedValue: '',
    client: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newTender: Tender = {
      id: `tender_${Date.now()}`,
      ...formData,
      createdBy: 'Current User',
      updatedBy: 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documents: [],
      technicalDocuments: [],
      workLog: [
        {
          id: `w${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: 'Current User',
          action: 'Created',
          description: 'Tender created',
        },
      ],
    };

    onCreate(newTender);
    onClose();
    
    // Reset form
    setFormData({
      tenderNumber: '',
      title: '',
      description: '',
      status: 'open',
      dueDate: '',
      estimatedValue: '',
      client: '',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[70%] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg">Create New Tender</h2>
              <p className="text-sm text-muted-foreground">Add a new tender opportunity to track</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSubmit} form="create-tender-form">
              <Save className="w-4 h-4 mr-2" />
              Create Tender
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <form id="create-tender-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tenderNumber">Tender Number *</Label>
                  <Input
                    id="tenderNumber"
                    placeholder="e.g., TND-2025-001"
                    value={formData.tenderNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, tenderNumber: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as Tender['status'] })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter tender title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter tender description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Input
                    id="client"
                    placeholder="Enter client name"
                    value={formData.client}
                    onChange={(e) =>
                      setFormData({ ...formData, client: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedValue">Estimated Value</Label>
                  <Input
                    id="estimatedValue"
                    placeholder="e.g., $500,000"
                    value={formData.estimatedValue}
                    onChange={(e) =>
                      setFormData({ ...formData, estimatedValue: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  required
                />
              </div>
            </form>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}