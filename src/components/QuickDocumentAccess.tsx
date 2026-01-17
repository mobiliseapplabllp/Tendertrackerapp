import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Download, FolderOpen } from 'lucide-react';
import { documentApi } from '../lib/api';
import type { Document } from '../lib/types';

interface QuickDocumentAccessProps {
  onNavigateToDocuments?: () => void;
}

export function QuickDocumentAccess({ onNavigateToDocuments }: QuickDocumentAccessProps) {
  const [favoriteDocs, setFavoriteDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavoriteDocuments();
  }, []);

  const fetchFavoriteDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentApi.getAll({ isFavorite: true });
      if (response.success && response.data) {
        // Get top 4 favorite documents
        setFavoriteDocs((response.data.data || []).slice(0, 4));
      }
    } catch (err) {
      console.error('Failed to load favorite documents:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Quick Document Access
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  if (favoriteDocs.length === 0) {
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
          No favorite documents yet. Mark documents as favorites to see them here.
        </p>
      </Card>
    );
  }

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
        {favoriteDocs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{doc.name}</p>
                {doc.categoryId && (
                  <Badge className="text-xs bg-gray-100 text-gray-800 mt-0.5">
                    Category
                  </Badge>
                )}
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
