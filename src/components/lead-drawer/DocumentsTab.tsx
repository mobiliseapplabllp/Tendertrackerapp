import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { FileText, Upload, Download, Trash2, Loader2, X } from 'lucide-react';
import { documentApi } from '../../lib/api';
import { useSettings } from '../../hooks/useSettings';
import { useConfiguration } from '../../hooks/useConfiguration';
import type { Document } from '../../lib/types';

interface DocumentsTabProps {
    leadId: number;
}

export function DocumentsTab({ leadId }: DocumentsTabProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { formatDate } = useSettings();
    const { getSetting } = useConfiguration();

    // Get configuration values
    const maxFileSizeMB = getSetting('document.max_file_size_mb', 10);
    const allowedExtensions = getSetting('document.allowed_extensions', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png']);
    const defaultCategoryId = getSetting('document.default_category_id', 1);

    // Fetch documents on mount
    useEffect(() => {
        fetchDocuments();
    }, [leadId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await documentApi.getByTenderId(leadId);

            if (response.success && response.data) {
                setDocuments(response.data.data || []);
            } else {
                setError(response.error || 'Failed to load documents');
            }
        } catch (err: any) {
            console.error('Error fetching documents:', err);
            setError(err.message || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB');
                return;
            }
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            setUploading(true);
            setError(null);

            const response = await documentApi.upload(selectedFile, {
                tenderId: leadId,
                name: selectedFile.name,
                categoryId: defaultCategoryId, // Dynamic from config
            });

            if (response.success) {
                await fetchDocuments();
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                setError(response.error || 'Failed to upload document');
            }
        } catch (err: any) {
            console.error('Error uploading document:', err);
            setError(err.message || 'Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docId: number, docName: string) => {
        if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;

        try {
            setError(null);
            const response = await documentApi.delete(docId);

            if (response.success) {
                await fetchDocuments();
            } else {
                setError(response.error || 'Failed to delete document');
            }
        } catch (err: any) {
            console.error('Error deleting document:', err);
            setError(err.message || 'Failed to delete document');
        }
    };

    const handleDownload = async (doc: Document) => {
        try {
            // Create a download link
            const link = document.createElement('a');
            link.href = `/api/documents/${doc.id}/download`;
            link.download = doc.originalName || doc.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            console.error('Error downloading document:', err);
            setError(err.message || 'Failed to download document');
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Upload Section */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileSelect}
                            className="bg-white"
                            accept={allowedExtensions.map((ext: string) => `.${ext}`).join(',')}
                        />
                    </div>
                    <Button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="flex-shrink-0"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload
                            </>
                        )}
                    </Button>
                    {selectedFile && !uploading && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearSelectedFile}
                            className="flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    PDF, Docs, Images up to {maxFileSizeMB}MB
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <FileText className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No documents attached yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Upload your first document to get started
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {doc.documentName || doc.originalName || doc.fileName}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                            <span>{formatFileSize(doc.fileSize)}</span>
                                            <span>•</span>
                                            <span>{formatDate(doc.uploadedAt)}</span>
                                            {doc.uploadedByName && (
                                                <>
                                                    <span>•</span>
                                                    <span>{doc.uploadedByName}</span>
                                                </>
                                            )}
                                        </div>
                                        {doc.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                {doc.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-500 hover:text-indigo-600"
                                        onClick={() => handleDownload(doc)}
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                                        onClick={() => handleDelete(doc.id, doc.documentName || doc.fileName)}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
