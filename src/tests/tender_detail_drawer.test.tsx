import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TenderDetailDrawer } from '../components/TenderDetailDrawer';
import { tenderApi, documentApi, companyApi, userApi, leadTypeApi, adminApi } from '../lib/api';
import React from 'react';

// Mock the API modules
vi.mock('../lib/api', () => ({
    authApi: {
        getCurrentUser: vi.fn(),
    },
    tenderApi: {
        getById: vi.fn(),
        update: vi.fn(),
        getActivities: vi.fn(),
        addActivity: vi.fn(),
        generateSummary: vi.fn(),
        chat: vi.fn(),
    },
    documentApi: {
        getAll: vi.fn(),
        upload: vi.fn(),
        delete: vi.fn(),
    },
    companyApi: {
        getAll: vi.fn(),
    },
    userApi: {
        getAll: vi.fn(),
    },
    leadTypeApi: {
        getAll: vi.fn(),
    },
    adminApi: {
        get: vi.fn(),
        getConfig: vi.fn(), // Ensure this is mocked
    }
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock ScrollArea
vi.mock('../components/ui/scroll-area', () => ({
    ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>
}));

// Mock Sheet components nicely
vi.mock('../components/ui/sheet', () => ({
    Sheet: ({ children, open }: any) => open ? <div>{children}</div> : null,
    SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
    SheetHeader: ({ children }: any) => <div>{children}</div>,
    SheetTitle: ({ children }: any) => <div>{children}</div>,
    SheetDescription: ({ children }: any) => <div>{children}</div>,
    SheetFooter: ({ children }: any) => <div>{children}</div>,
    SheetClose: ({ children }: any) => <div>{children}</div>,
}));

// Mock Radix Tabs to ensure reliable switching in JSDOM using Context
vi.mock('../components/ui/tabs', async () => {
    const React = await import('react');
    const { createContext, useContext } = React;
    const TabsContext = createContext({ value: '', onValueChange: (v: any) => { } });

    return {
        Tabs: ({ value, onValueChange, children }: any) => (
            <TabsContext.Provider value={{ value, onValueChange }}>
                <div data-testid="tabs">{children}</div>
            </TabsContext.Provider>
        ),
        TabsList: ({ children }: any) => <div>{children}</div>,
        TabsTrigger: ({ value, children }: any) => {
            const ctx = useContext(TabsContext);
            return (
                <button
                    role="tab"
                    aria-selected={ctx.value === value}
                    onClick={() => ctx.onValueChange(value)}
                >
                    {children}
                </button>
            );
        },
        TabsContent: ({ value, children }: any) => {
            const ctx = useContext(TabsContext);
            if (ctx.value !== value) return null;
            return <div>{children}</div>;
        }
    }
});


const mockTender = {
    id: 1,
    tenderNumber: 'T-2023-001',
    title: 'Office Complex Renovation',
    client: 'Acme Corp',
    status: 'Draft',
    priority: 'Medium',
    submissionDeadline: '2023-12-31',
    estimatedValue: 500000,
    currency: 'INR',
    createdBy: 'John Doe',
    companyId: 101,
    assignedTo: 1
};

const mockCompany = { id: 101, companyName: 'Acme Corp' };
const mockUser = { id: 1, fullName: 'John Doe' };
const mockDocuments = [
    { id: 1, fileName: 'specs.pdf', fileSize: 1024, uploadedAt: '2023-01-01', uploadedByName: 'John' }
];
const mockActivities = [
    { id: 1, activityType: 'Created', description: 'Tender created', createdAt: '2023-01-01', user: { fullName: 'John' } }
];

describe('TenderDetailDrawer Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (tenderApi.getById as any).mockResolvedValue({ success: true, data: mockTender });
        (tenderApi.getActivities as any).mockResolvedValue({ success: true, data: mockActivities });
        (documentApi.getAll as any).mockResolvedValue({ success: true, data: { data: mockDocuments } });
        (companyApi.getAll as any).mockResolvedValue({ success: true, data: { data: [mockCompany] } });
        (userApi.getAll as any).mockResolvedValue({ success: true, data: { data: [mockUser] } });
        (leadTypeApi.getAll as any).mockResolvedValue({ success: true, data: [] });
        (adminApi.get as any).mockResolvedValue({ success: true, data: null });
        (adminApi.getConfig as any).mockResolvedValue({ success: true, data: null });
    });

    it('fetches and displays tender details on mount', async () => {
        render(<TenderDetailDrawer tenderId={1} isOpen={true} onClose={vi.fn()} onUpdate={vi.fn()} />);

        // Verify Content
        await waitFor(() => {
            expect(screen.getByText('Office Complex Renovation')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Office Complex Renovation')).toBeInTheDocument(); // Input field
            expect(screen.getByText('T-2023-001')).toBeInTheDocument();
        });
    });

    it('renders documents tab and list', async () => {
        const user = userEvent.setup();
        render(<TenderDetailDrawer tenderId={1} isOpen={true} onClose={vi.fn()} onUpdate={vi.fn()} />);

        // Wait for load
        await screen.findByText('Office Complex Renovation');

        // Switch to Documents tab
        const docsTab = screen.getByRole('tab', { name: /Documents/i });
        await user.click(docsTab);

        // Look for content
        await waitFor(() => {
            expect(screen.getByText('specs.pdf')).toBeInTheDocument();
        });
    });

    it('renders activity tab and list', async () => {
        const user = userEvent.setup();
        render(<TenderDetailDrawer tenderId={1} isOpen={true} onClose={vi.fn()} onUpdate={vi.fn()} />);

        // Wait for load
        await screen.findByText('Office Complex Renovation');

        // Switch to Activity tab
        const activityTab = screen.getByRole('tab', { name: /Activity/i });
        await user.click(activityTab);

        await waitFor(() => {
            expect(screen.getByText('Tender created')).toBeInTheDocument();
        });
    });

    it('calls update API when Save is clicked', async () => {
        const user = userEvent.setup();
        const onUpdateMock = vi.fn();
        (tenderApi.update as any).mockResolvedValue({ success: true, data: { ...mockTender, title: 'Updated Title' } });

        render(<TenderDetailDrawer tenderId={1} isOpen={true} onClose={vi.fn()} onUpdate={onUpdateMock} />);

        // Wait for load
        await screen.findByText('Office Complex Renovation');

        await waitFor(() => expect(screen.getByDisplayValue('Office Complex Renovation')).toBeInTheDocument());

        // Modify Title
        const titleInput = screen.getByDisplayValue('Office Complex Renovation');
        await user.clear(titleInput);
        await user.type(titleInput, 'Updated Title');

        // Click Save
        const saveBtn = screen.getByText('Save');
        await user.click(saveBtn);

        await waitFor(() => {
            expect(tenderApi.update).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Updated Title' }));
            expect(onUpdateMock).toHaveBeenCalled();
        });
    });

    it('renders AI Insights tab and generates summary', async () => {
        const user = userEvent.setup();
        (tenderApi.generateSummary as any).mockResolvedValue({ success: true, data: { summary: 'AI Generated Summary Content' } });

        render(<TenderDetailDrawer tenderId={1} isOpen={true} onClose={vi.fn()} onUpdate={vi.fn()} />);
        await screen.findByText('Office Complex Renovation');

        // Switch to AI Insights tab
        const aiTab = screen.getByRole('tab', { name: /AI Insights/i });
        await user.click(aiTab);

        // Check initial state (Analyze button visible)
        expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();

        // Click Generate
        await user.click(screen.getByRole('button', { name: /Generate/i }));

        // Wait for summary
        await waitFor(() => {
            expect(tenderApi.generateSummary).toHaveBeenCalledWith(1);
            expect(screen.getByText('AI Generated Summary Content')).toBeInTheDocument();
        });
    });

    it('allows adding a work log', async () => {
        const user = userEvent.setup();
        (tenderApi.addActivity as any).mockResolvedValue({ success: true, data: {} });
        (tenderApi.getActivities as any).mockResolvedValue({
            success: true, data: [
                ...mockActivities,
                { id: 102, tender_id: 1, user_id: 1, activity_type: 'Commented', description: 'New Work Log', created_at: new Date().toISOString(), user_name: 'Test User' }
            ]
        });

        render(<TenderDetailDrawer tenderId={1} isOpen={true} onClose={vi.fn()} onUpdate={vi.fn()} />);
        await screen.findByText('Office Complex Renovation');

        // Switch to Activity tab
        const actTab = screen.getByRole('tab', { name: /Activity/i });
        await user.click(actTab);

        // Find input and type
        const input = screen.getByPlaceholderText(/Add a note or work log/i);
        await user.type(input, 'New Work Log');
        await user.keyboard('{Enter}');

        await waitFor(() => {
            expect(tenderApi.addActivity).toHaveBeenCalledWith(1, expect.objectContaining({ description: 'New Work Log' }));
        });
    });
});
