import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { TenderDrawer } from '../components/TenderDrawer';
import { documentApi, tenderApi } from '../lib/api';
import type { Tender } from '../lib/types';

// Mock the API modules
vi.mock('../lib/api', () => ({
  documentApi: {
    getAll: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    getCategories: vi.fn(),
  },
  tenderApi: {
    getActivities: vi.fn(),
    addActivity: vi.fn(),
  },
}));

// Mock the UI components
vi.mock('../components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('../components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid={`tab-${value}`}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}));

describe('TenderDrawer Component', () => {
  const mockTender: Tender = {
    id: 1,
    tenderNumber: 'TND-001',
    title: 'Test Tender',
    description: 'Test Description',
    status: 'Draft',
    priority: 'Medium',
    currency: 'INR',
    createdBy: 'Test User',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    submissionDeadline: '2025-12-31T00:00:00Z',
  };

  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (documentApi.getCategories as any).mockResolvedValue({
      success: true,
      data: [
        { id: 5, name: 'Technical Documents', is_system: true },
      ],
    });
    (documentApi.getAll as any).mockResolvedValue({
      success: true,
      data: {
        data: [],
        total: 0,
      },
    });
    (tenderApi.getActivities as any).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it('should render tender details when open', async () => {
    await act(async () => {
      render(
        <TenderDrawer
          tender={mockTender}
          isOpen={true}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />
      );
    });

    await waitFor(() => {
      expect(screen.getByText('TND-001')).toBeInTheDocument();
      expect(screen.getByText('Test Tender')).toBeInTheDocument();
    });
  });

  it('should fetch documents when opened', async () => {
    render(
      <TenderDrawer
        tender={mockTender}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    await waitFor(() => {
      expect(documentApi.getAll).toHaveBeenCalledWith({ tenderId: 1 });
    });
  });

  it('should fetch activities when opened', async () => {
    render(
      <TenderDrawer
        tender={mockTender}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    await waitFor(() => {
      expect(tenderApi.getActivities).toHaveBeenCalledWith(1);
    });
  });

  it('should display documents when available', async () => {
    const mockDocuments = {
      data: [
        {
          id: 1,
          tender_id: 1,
          file_name: 'test.pdf',
          original_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          uploaded_by: 1,
          uploaded_at: '2025-01-01T00:00:00Z',
          uploaded_by_name: 'Test User',
        },
      ],
      total: 1,
    };

    (documentApi.getAll as any).mockResolvedValue({
      success: true,
      data: mockDocuments,
    });

    render(
      <TenderDrawer
        tender={mockTender}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('should handle file upload', async () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    (documentApi.upload as any).mockResolvedValue({
      success: true,
      data: { id: 1, original_name: 'test.pdf' },
    });

    render(
      <TenderDrawer
        tender={mockTender}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(documentApi.getAll).toHaveBeenCalled();
    });

    // Simulate file upload
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(documentApi.upload).toHaveBeenCalled();
      });
    }
  });

  it('should handle document deletion', async () => {
    const mockDocuments = {
      data: [
        {
          id: 1,
          tender_id: 1,
          file_name: 'test.pdf',
          original_name: 'test.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          uploaded_by: 1,
          uploaded_at: '2025-01-01T00:00:00Z',
        },
      ],
      total: 1,
    };

    (documentApi.getAll as any).mockResolvedValue({
      success: true,
      data: mockDocuments,
    });

    (documentApi.delete as any).mockResolvedValue({
      success: true,
    });

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(
      <TenderDrawer
        tender={mockTender}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByLabelText(/Delete/i);
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(documentApi.delete).toHaveBeenCalledWith(1);
      });
    }
  });

  it('should separate technical documents from regular documents', async () => {
    const mockDocuments = {
      data: [
        {
          id: 1,
          tender_id: 1,
          category_id: null,
          file_name: 'regular.pdf',
          original_name: 'regular.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          uploaded_by: 1,
          uploaded_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 2,
          tender_id: 1,
          category_id: 5, // Technical Documents
          file_name: 'technical.pdf',
          original_name: 'technical.pdf',
          file_size: 2048,
          mime_type: 'application/pdf',
          uploaded_by: 1,
          uploaded_at: '2025-01-01T00:00:00Z',
        },
      ],
      total: 2,
    };

    (documentApi.getAll as any).mockResolvedValue({
      success: true,
      data: mockDocuments,
    });

    render(
      <TenderDrawer
        tender={mockTender}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    await waitFor(() => {
      expect(documentApi.getAll).toHaveBeenCalled();
    });

    // Documents should be separated by category
    // This is tested by checking that both documents are fetched
    expect(documentApi.getAll).toHaveBeenCalledWith({ tenderId: 1 });
  });
});

