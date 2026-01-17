import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeadDetailDrawer } from '../LeadDetailDrawer';
import * as api from '../../lib/api';

// Mock the API module
vi.mock('../../lib/api', () => ({
    leadApi: {
        getById: vi.fn(),
        update: vi.fn(),
    },
    configurationApi: {
        getAllSettings: vi.fn(),
        getDropdownOptions: vi.fn(),
    },
}));

describe('LeadDetailDrawer', () => {
    const mockLead = {
        id: 1,
        leadNumber: 'LEAD-001',
        tenderNumber: null,
        title: 'Test Lead Title',
        description: 'Test lead description',
        status: 'Draft',
        client: 'Test Client',
        contactPerson: 'John Doe',
        contactEmail: 'john@example.com',
        contactPhone: '+1234567890',
        estimatedValue: 100000,
        dealValue: null,
        currency: 'INR',
        submissionDeadline: '2026-02-01',
        location: 'Mumbai',
        createdBy: 'Jane Smith',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-15',
    };

    const defaultProps = {
        leadId: 1,
        isOpen: true,
        onClose: vi.fn(),
        onUpdate: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should not render when closed', () => {
            const { container } = render(
                <LeadDetailDrawer {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render drawer when open', () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByLabelText('Close drawer')).toBeInTheDocument();
        });

        it('should have proper ARIA attributes', () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-modal', 'true');
            expect(dialog).toHaveAttribute('aria-labelledby', 'drawer-title');
        });
    });

    describe('Data Fetching', () => {
        it('should fetch and display lead details when opened', async () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            // Should show loading state initially
            expect(screen.getByRole('status')).toBeInTheDocument();
            expect(screen.getByText('Loading lead details...')).toBeInTheDocument();

            // Wait for data to load
            await waitFor(() => {
                expect(screen.getByText('LEAD-001')).toBeInTheDocument();
                expect(screen.getByText('Test Lead Title')).toBeInTheDocument();
            });

            expect(api.leadApi.getById).toHaveBeenCalledWith(1);
            expect(api.leadApi.getById).toHaveBeenCalledTimes(1);
        });

        it('should not fetch when leadId is null', () => {
            render(<LeadDetailDrawer {...defaultProps} leadId={null} />);

            expect(api.leadApi.getById).not.toHaveBeenCalled();
        });

        it('should refetch when leadId changes', async () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            const { rerender } = render(<LeadDetailDrawer {...defaultProps} leadId={1} />);

            await waitFor(() => {
                expect(api.leadApi.getById).toHaveBeenCalledWith(1);
            });

            // Change leadId
            rerender(<LeadDetailDrawer {...defaultProps} leadId={2} />);

            await waitFor(() => {
                expect(api.leadApi.getById).toHaveBeenCalledWith(2);
            });

            expect(api.leadApi.getById).toHaveBeenCalledTimes(2);
        });
    });

    describe('Loading State', () => {
        it('should show loading spinner while fetching', () => {
            vi.mocked(api.leadApi.getById).mockImplementation(
                () => new Promise(() => { }) as any // Never resolves
            );

            render(<LeadDetailDrawer {...defaultProps} />);

            expect(screen.getByRole('status')).toBeInTheDocument();
            expect(screen.getByText('Loading lead details...')).toBeInTheDocument();
        });

        it('should hide loading state after data loads', async () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.queryByRole('status')).not.toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error message when API call fails', async () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: false,
                error: 'Failed to load lead',
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('Error Loading Lead')).toBeInTheDocument();
                expect(screen.getByText('Failed to load lead')).toBeInTheDocument();
            });
        });

        it('should display error message when API throws exception', async () => {
            vi.mocked(api.leadApi.getById).mockRejectedValue(
                new Error('Network error')
            );

            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });

        it('should allow retry after error', async () => {
            vi.mocked(api.leadApi.getById)
                .mockResolvedValueOnce({
                    success: false,
                    error: 'Failed to load lead',
                } as any)
                .mockResolvedValueOnce({
                    success: true,
                    data: mockLead,
                } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            // Wait for error
            await waitFor(() => {
                expect(screen.getByText('Failed to load lead')).toBeInTheDocument();
            });

            // Click retry
            const retryButton = screen.getByRole('button', { name: /try again/i });
            await userEvent.click(retryButton);

            // Should load successfully
            await waitFor(() => {
                expect(screen.getByText('LEAD-001')).toBeInTheDocument();
            });

            expect(api.leadApi.getById).toHaveBeenCalledTimes(2);
        });
    });

    describe('Close Functionality', () => {
        it('should close when X button is clicked', async () => {
            const onClose = vi.fn();
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            render(<LeadDetailDrawer {...defaultProps} onClose={onClose} />);

            await waitFor(() => {
                expect(screen.getByText('LEAD-001')).toBeInTheDocument();
            });

            const closeButton = screen.getByLabelText('Close drawer');
            await userEvent.click(closeButton);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should close when overlay is clicked', async () => {
            const onClose = vi.fn();
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            const { container } = render(
                <LeadDetailDrawer {...defaultProps} onClose={onClose} />
            );

            await waitFor(() => {
                expect(screen.getByText('LEAD-001')).toBeInTheDocument();
            });

            const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');
            expect(overlay).toBeInTheDocument();

            if (overlay) {
                await userEvent.click(overlay);
            }

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should reset to overview tab when reopened', async () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            const { rerender } = render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('LEAD-001')).toBeInTheDocument();
            });

            // Switch to documents tab
            const documentsTab = screen.getByRole('tab', { name: /documents/i });
            await userEvent.click(documentsTab);

            expect(screen.getByText(/documents tab - coming in phase 3/i)).toBeInTheDocument();

            // Close drawer
            rerender(<LeadDetailDrawer {...defaultProps} isOpen={false} />);

            // Reopen drawer
            rerender(<LeadDetailDrawer {...defaultProps} isOpen={true} />);

            await waitFor(() => {
                // Should be back on overview tab
                const overviewTab = screen.getByRole('tab', { name: /overview/i });
                expect(overviewTab).toHaveAttribute('data-state', 'active');
            });
        });
    });

    describe('Tabs', () => {
        beforeEach(() => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);
        });

        it('should render all tabs', async () => {
            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('LEAD-001')).toBeInTheDocument();
            });

            expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /documents/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /activities/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /ai features/i })).toBeInTheDocument();
        });

        it('should default to overview tab', async () => {
            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('LEAD-001')).toBeInTheDocument();
            });

            const overviewTab = screen.getByRole('tab', { name: /overview/i });
            expect(overviewTab).toHaveAttribute('data-state', 'active');
        });

        it('should switch tabs when clicked', async () => {
            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('LEAD-001')).toBeInTheDocument();
            });

            // Click documents tab
            const documentsTab = screen.getByRole('tab', { name: /documents/i });
            await userEvent.click(documentsTab);

            expect(documentsTab).toHaveAttribute('data-state', 'active');
            expect(screen.getByText(/documents tab - coming in phase 3/i)).toBeInTheDocument();

            // Click activities tab
            const activitiesTab = screen.getByRole('tab', { name: /activities/i });
            await userEvent.click(activitiesTab);

            expect(activitiesTab).toHaveAttribute('data-state', 'active');
            expect(screen.getByText(/activities tab - coming in phase 4/i)).toBeInTheDocument();
        });
    });

    describe('Header Display', () => {
        it('should display lead number in header', async () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                const header = screen.getByText('LEAD-001');
                expect(header).toBeInTheDocument();
                expect(header.tagName).toBe('H2');
            });
        });

        it('should display tender number if lead number is not available', async () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: { ...mockLead, leadNumber: null, tenderNumber: 'TENDER-123' },
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('TENDER-123')).toBeInTheDocument();
            });
        });

        it('should display title in subtitle', async () => {
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: mockLead,
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('Test Lead Title')).toBeInTheDocument();
            });
        });

        it('should truncate long titles', async () => {
            const longTitle = 'A'.repeat(200);
            vi.mocked(api.leadApi.getById).mockResolvedValue({
                success: true,
                data: { ...mockLead, title: longTitle },
            } as any);

            render(<LeadDetailDrawer {...defaultProps} />);

            await waitFor(() => {
                const titleElement = screen.getByText(longTitle);
                expect(titleElement).toHaveClass('truncate');
            });
        });
    });
});
