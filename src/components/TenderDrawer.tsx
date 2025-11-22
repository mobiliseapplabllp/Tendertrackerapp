import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { QuickDocumentAccess } from './QuickDocumentAccess';
import { Tender, TenderDocument, WorkLogEntry } from '../lib/mockData';
import {
  X,
  FileText,
  Upload,
  Download,
  Trash2,
  Save,
  Clock,
  User,
  Calendar,
  DollarSign,
  Building2,
} from 'lucide-react';

interface TenderDrawerProps {
  tender: Tender | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (tender: Tender) => void;
}

export function TenderDrawer({ tender, isOpen, onClose, onUpdate }: TenderDrawerProps) {
  const [editedTender, setEditedTender] = useState<Tender | null>(null);
  const [newWorkLog, setNewWorkLog] = useState('');

  useEffect(() => {
    if (tender) {
      setEditedTender({ ...tender });
    }
  }, [tender]);

  if (!isOpen || !editedTender) return null;

  const handleSave = () => {
    if (editedTender) {
      const updatedTender = {
        ...editedTender,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Current User', // In real app, get from auth
      };
      onUpdate(updatedTender);
    }
  };

  const handleAddWorkLog = () => {
    if (newWorkLog.trim() && editedTender) {
      const newEntry: WorkLogEntry = {
        id: `w${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: 'Current User',
        action: 'Updated',
        description: newWorkLog,
      };
      setEditedTender({
        ...editedTender,
        workLog: [newEntry, ...editedTender.workLog],
      });
      setNewWorkLog('');
    }
  };

  const handleFileUpload = (type: 'documents' | 'technicalDocuments') => {
    // Simulate file upload
    const newDoc: TenderDocument = {
      id: `doc${Date.now()}`,
      name: `Uploaded_Document_${Date.now()}.pdf`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Current User',
      size: '1.2 MB',
      type: 'pdf',
    };

    if (editedTender) {
      setEditedTender({
        ...editedTender,
        [type]: [...editedTender[type], newDoc],
      });
    }
  };

  const handleDeleteDocument = (
    type: 'documents' | 'technicalDocuments',
    docId: string
  ) => {
    if (editedTender) {
      setEditedTender({
        ...editedTender,
        [type]: editedTender[type].filter((doc) => doc.id !== docId),
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      submitted: 'bg-purple-100 text-purple-800',
      won: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

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
              <h2 className="text-lg">{editedTender.tenderNumber}</h2>
              <p className="text-sm text-muted-foreground">{editedTender.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Tender Documents</TabsTrigger>
                <TabsTrigger value="technical">Technical Docs</TabsTrigger>
                <TabsTrigger value="worklog">Work Log</TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editedTender.status}
                      onValueChange={(value) =>
                        setEditedTender({
                          ...editedTender,
                          status: value as Tender['status'],
                        })
                      }
                    >
                      <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={editedTender.dueDate}
                      onChange={(e) =>
                        setEditedTender({
                          ...editedTender,
                          dueDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editedTender.title}
                    onChange={(e) =>
                      setEditedTender({
                        ...editedTender,
                        title: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editedTender.description}
                    onChange={(e) =>
                      setEditedTender({
                        ...editedTender,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Input
                      value={editedTender.client}
                      onChange={(e) =>
                        setEditedTender({
                          ...editedTender,
                          client: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estimated Value</Label>
                    <Input
                      value={editedTender.estimatedValue}
                      onChange={(e) =>
                        setEditedTender({
                          ...editedTender,
                          estimatedValue: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>Created By</span>
                    </div>
                    <p>{editedTender.createdBy}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Created At</span>
                    </div>
                    <p>{new Date(editedTender.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>Updated By</span>
                    </div>
                    <p>{editedTender.updatedBy}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Updated At</span>
                    </div>
                    <p>{new Date(editedTender.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>

              {/* Tender Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h3>Tender Documents</h3>
                  <Button
                    size="sm"
                    onClick={() => handleFileUpload('documents')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>

                <div className="space-y-2">
                  {editedTender.documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No tender documents uploaded yet</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleFileUpload('documents')}
                      >
                        Upload your first document
                      </Button>
                    </div>
                  ) : (
                    editedTender.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p>{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.size} • Uploaded by {doc.uploadedBy} •{' '}
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument('documents', doc.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Technical Documents Tab */}
              <TabsContent value="technical" className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h3>Technical Documents</h3>
                  <Button
                    size="sm"
                    onClick={() => handleFileUpload('technicalDocuments')}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>

                <div className="space-y-2">
                  {editedTender.technicalDocuments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No technical documents uploaded yet</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleFileUpload('technicalDocuments')}
                      >
                        Upload your first document
                      </Button>
                    </div>
                  ) : (
                    editedTender.technicalDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p>{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.size} • Uploaded by {doc.uploadedBy} •{' '}
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleDeleteDocument('technicalDocuments', doc.id)
                            }
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Work Log Tab */}
              <TabsContent value="worklog" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Add Work Log Entry</Label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Describe the work done or updates made..."
                      value={newWorkLog}
                      onChange={(e) => setNewWorkLog(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleAddWorkLog} disabled={!newWorkLog.trim()}>
                    Add Entry
                  </Button>
                </div>

                <Separator />

                {/* Quick Document Access */}
                <QuickDocumentAccess />

                <Separator />

                <div className="space-y-4">
                  <h3>Activity Timeline</h3>
                  {editedTender.workLog.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No work log entries yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editedTender.workLog.map((entry, index) => (
                        <div key={entry.id} className="relative pl-6 pb-4">
                          {index !== editedTender.workLog.length - 1 && (
                            <div className="absolute left-2 top-6 bottom-0 w-px bg-gray-200" />
                          )}
                          <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-indigo-600" />
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(entry.action.toLowerCase())}>
                                  {entry.action}
                                </Badge>
                                <span className="text-sm">{entry.user}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{entry.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}