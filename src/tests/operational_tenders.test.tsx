
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TenderDashboard } from '../components/TenderDashboard';
import { authApi, tenderApi, documentApi, leadTypeApi } from '../lib/api';
import React from 'react';

// Mock the API modules
vi.mock('../lib/api', () => ({
    authApi: {
        getCurrentUser: vi.fn(),
    },
    tenderApi: {
        getAll: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    documentApi: {
        list: vi.fn(),
        upload: vi.fn(),
    },
    leadTypeApi: {
        getAll: vi.fn(),
    },
    adminApi: {
        get: vi.fn(),
    },
}));

// Mock TenderDetailDrawer to avoid Radix UI portal/animation issues in test
vi.mock('../components/TenderDetailDrawer', () => ({
    TenderDetailDrawer: ({ isOpen, tenderId, onClose }: any) => {
        if (!isOpen) return null;
        return (
            <div data-testid="tender-detail-drawer">
                Drawer Content for Tender {tenderId}
                <button onClick={onClose}>Close</button>
            </div>
        );
    },
}));

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock ScrollArea to avoid layout issues in JSDOM
vi.mock('../components/ui/scroll-area', () => ({
    ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>
}));

const mockTenders = [
    {
        id: 1,
        tenderNumber: 'T-2023-001',
        title: 'Office Complex Renovation',
        client: 'Acme Corp',
        status: 'Draft', // Using Draft to match default "Active" tab logic inclusion
        submissionDeadline: '2023-12-31',
        estimatedValue: 500000,
        currency: 'USD',
        createdBy: 'John Doe',
    },
    {
        id: 2,
        tenderNumber: 'T-2023-002',
        title: 'Highway Construction',
        client: 'State Govt',
        status: 'Submitted',
        submissionDeadline: '2024-01-15',
        estimatedValue: 1200000,
        currency: 'USD',
        createdBy: 'Jane Smith',
    },
];

const mockUser = {
    id: 1,
    fullName: 'Test User',
    email: 'test@example.com',
    role: 'Admin',
};

const mockLeadTypes = [
    { id: 1, name: 'Tender' },
    { id: 2, name: 'Lead' }
];

describe('Operational Core - Tender Management', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (authApi.getCurrentUser as any).mockResolvedValue({ success: true, data: mockUser });
        (leadTypeApi.getAll as any).mockResolvedValue({ success: true, data: mockLeadTypes });
        // Mock getAll to return mockTenders
        (tenderApi.getAll as any).mockResolvedValue({
            success: true,
            data: {
                data: mockTenders,
                total: 2,
                totalPages: 1
            }
        });
    });

    it('renders the dashboard with tender list', async () => {
        render(<TenderDashboard onLogout={vi.fn()} onNavigate={vi.fn()} />);

        // Check header
        expect(screen.getByText('Tenders')).toBeInTheDocument();

        // Wait for tenders to load
        await waitFor(() => {
            expect(screen.getByText('Office Complex Renovation')).toBeInTheDocument();
            expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        });
    });

    it('opens the Wide Drawer when a tender row is clicked', async () => {
        render(<TenderDashboard onLogout={vi.fn()} onNavigate={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Office Complex Renovation')).toBeInTheDocument();
        });

        // Click on the first tender row
        const row = screen.getByText('Office Complex Renovation').closest('tr');
        fireEvent.click(row!);

        // Check if mocked drawer is displayed
        await waitFor(() => {
            expect(screen.getByTestId('tender-detail-drawer')).toBeInTheDocument();
            expect(screen.getByText('Drawer Content for Tender 1')).toBeInTheDocument();
        });
    });

    it('allows filtering by status tabs', async () => {
        render(<TenderDashboard onLogout={vi.fn()} onNavigate={vi.fn()} />);

        // Initial load calls getAll with default filters
        await waitFor(() => {
            expect(tenderApi.getAll).toHaveBeenCalled();
        });

        // Click Draft tab
        const draftTab = screen.getByRole('tab', { name: /Draft/ });
        fireEvent.click(draftTab);

        // Verify API called with status 'Draft'
        await waitFor(() => {
            expect(tenderApi.getAll).toHaveBeenCalledWith(expect.objectContaining({
                status: ['Draft'],
                leadTypeId: 1
            }));
        });
    });
});
