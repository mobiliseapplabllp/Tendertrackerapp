import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Download, FolderOpen } from 'lucide-react';

interface QuickDocument {
  id: string;
  name: string;
  type: string;
  category: string;
}

interface QuickDocumentAccessProps {
  onNavigateToDocuments?: () => void;
}

export function QuickDocumentAccess({ onNavigateToDocuments }: QuickDocumentAccessProps) {
  // Mock frequently used documents - in production, fetch from API
  const quickDocs: QuickDocument[] = [
    { id: '1', name: 'GST Certificate', type: 'PDF', category: 'Tax' },
    { id: '2', name: 'PAN Card', type: 'PDF', category: 'Tax' },
    { id: '3', name: 'ISO Certificate', type: 'PDF', category: 'Certification' },
    { id: '4', name: 'Bank Details', type: 'PDF', category: 'Company' },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Quick Document Access
        </h4>
        {onNavigateToDocuments && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToDocuments}
            className="text-xs h-7"
          >
            View All
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Frequently used documents for tender submissions
      </p>
      <div className="space-y-2">
        {quickDocs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{doc.name}</p>
                <Badge className="text-xs bg-gray-100 text-gray-800 mt-0.5">
                  {doc.category}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <Download className="w-3 h-3 text-blue-600" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
