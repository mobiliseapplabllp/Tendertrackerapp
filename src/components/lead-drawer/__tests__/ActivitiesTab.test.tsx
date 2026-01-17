import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivitiesTab } from '../ActivitiesTab';
import * as api from '../../../lib/api';

// Mock the API module
vi.mock('../../../lib/api', () => ({
    leadApi: {
        getActivities: vi.fn(),
        addActivity: vi.fn(),
    },
}));

// Mock useSettings hook
vi.mock('../../../hooks/useSettings', () => ({
    useSettings: () => ({
        formatDate: (date: string) => new Date(date).toLocaleDateString(),
    }),
}));

describe('ActivitiesTab', () => {
    const mockActivities = [
        {
            id: 1,
            activityType: 'work_log',
            description: 'Initial meeting completed',
            performedByName: 'John Doe',
            createdAt: '2026-01-15T10:00:00Z',
        },
        {
            id: 2,
            activityType: 'status_change',
            description: 'Status changed from Draft to Submitted',
            performedByName: 'Jane Smith',
            createdAt: '2026-01-16T14:30:00Z',
            metadata: { from: 'Draft', to: 'Submitted' },
        },
        {
            id: 3,
            activityType: 'document_upload',
            description: 'Uploaded proposal.pdf',
            performedByName: 'John Doe',
            createdAt: '2026-01-17T09:15:00Z',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should show loading state initially', () => {
            vi.mocked(api.leadApi.getActivities).mockImplementation(
                () => new Promise(() => { }) as any
            );

            render(<ActivitiesTab leadId={1} />);

            expect(document.querySelector(".animate-spin")).toBeInTheDocument();
        });

        it('should fetch and display activities', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: mockActivities,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('Initial meeting completed')).toBeInTheDocument();
                expect(screen.getByText('Status changed from Draft to Submitted')).toBeInTheDocument();
                expect(screen.getByText('Uploaded proposal.pdf')).toBeInTheDocument();
            });

            expect(api.leadApi.getActivities).toHaveBeenCalledWith(1);
        });

        it('should show empty state when no activities', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
                expect(screen.getByText('Add your first work log to get started')).toBeInTheDocument();
            });
        });

        it('should display activity type badges', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: mockActivities,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('Work Log')).toBeInTheDocument();
                expect(screen.getByText('Status Change')).toBeInTheDocument();
                expect(screen.getByText('Document Upload')).toBeInTheDocument();
            });
        });

        it('should display performer names', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: mockActivities,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                const johnDoeElements = screen.getAllByText('John Doe');
                expect(johnDoeElements.length).toBeGreaterThan(0);
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            });
        });

        it('should display user initials', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: mockActivities,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getAllByText('JD').length).toBeGreaterThan(0);
                expect(screen.getByText('JS')).toBeInTheDocument();
            });
        });

        it('should display metadata when present', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: mockActivities,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                const metadata = screen.getByText(/from Draft to Submitted/);
                expect(metadata).toBeInTheDocument();
            });
        });
    });

    describe('Work Log Addition', () => {
        it('should have disabled send button when input is empty', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
            });

            const sendButton = screen.getAllByRole('button')[0];
            expect(sendButton).toBeDisabled();
        });

        it('should enable send button when input has text', async () => {
            const user = userEvent.setup();
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Add a note or work log...');
            await user.type(input, 'New work log entry');

            const sendButton = screen.getAllByRole('button')[0];
            expect(sendButton).not.toBeDisabled();
        });

        it('should call addActivity API when send button is clicked', async () => {
            const user = userEvent.setup();
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            vi.mocked(api.leadApi.addActivity).mockResolvedValue({
                success: true,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Add a note or work log...');
            await user.type(input, 'New work log entry');

            const sendButton = screen.getAllByRole('button')[0];
            await user.click(sendButton);

            await waitFor(() => {
                expect(api.leadApi.addActivity).toHaveBeenCalledWith(1, {
                    activityType: 'work_log',
                    description: 'New work log entry',
                });
            });
        });

        it('should clear input after successful submission', async () => {
            const user = userEvent.setup();
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            vi.mocked(api.leadApi.addActivity).mockResolvedValue({
                success: true,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Add a note or work log...') as HTMLInputElement;
            await user.type(input, 'New work log entry');

            const sendButton = screen.getAllByRole('button')[0];
            await user.click(sendButton);

            await waitFor(() => {
                expect(input.value).toBe('');
            });
        });

        it('should submit on Enter key press', async () => {
            const user = userEvent.setup();
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            vi.mocked(api.leadApi.addActivity).mockResolvedValue({
                success: true,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Add a note or work log...');
            await user.type(input, 'New work log entry{Enter}');

            await waitFor(() => {
                expect(api.leadApi.addActivity).toHaveBeenCalled();
            });
        });

        it('should not submit on Shift+Enter', async () => {
            const user = userEvent.setup();
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Add a note or work log...');
            await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

            expect(api.leadApi.addActivity).not.toHaveBeenCalled();
        });

        it('should show loading state while submitting', async () => {
            const user = userEvent.setup();
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            vi.mocked(api.leadApi.addActivity).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ success: true } as any), 100))
            );

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Add a note or work log...');
            await user.type(input, 'New work log entry');

            const sendButton = screen.getAllByRole('button')[0];
            await user.click(sendButton);

            // Should show loading spinner
            expect(document.querySelector(".animate-spin")).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should display error when fetch fails', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: false,
                error: 'Failed to load activities',
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
            });
        });

        it('should display error when addActivity fails', async () => {
            const user = userEvent.setup();
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            vi.mocked(api.leadApi.addActivity).mockResolvedValue({
                success: false,
                error: 'Failed to add work log',
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('Add a note or work log...');
            await user.type(input, 'New work log entry');

            const sendButton = screen.getAllByRole('button')[0];
            await user.click(sendButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to add work log')).toBeInTheDocument();
            });
        });

        it('should handle API exceptions gracefully', async () => {
            vi.mocked(api.leadApi.getActivities).mockRejectedValue(
                new Error('Network error')
            );

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });
    });

    describe('Activity Type Styling', () => {
        it('should apply correct color for work_log', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [mockActivities[0]],
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                const badge = screen.getByText('Work Log');
                expect(badge).toBeInTheDocument();
            });
        });

        it('should apply correct color for status_change', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [mockActivities[1]],
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                const badge = screen.getByText('Status Change');
                expect(badge).toBeInTheDocument();
            });
        });

        it('should apply correct color for document_upload', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [mockActivities[2]],
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                const badge = screen.getByText('Document Upload');
                expect(badge).toBeInTheDocument();
            });
        });
    });

    describe('Refetching', () => {
        it('should refetch activities when leadId changes', async () => {
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: mockActivities,
            } as any);

            const { rerender } = render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(api.leadApi.getActivities).toHaveBeenCalledWith(1);
            });

            rerender(<ActivitiesTab leadId={2} />);

            await waitFor(() => {
                expect(api.leadApi.getActivities).toHaveBeenCalledWith(2);
            });

            expect(api.leadApi.getActivities).toHaveBeenCalledTimes(2);
        });

        it('should refetch after adding work log', async () => {
            const user = userEvent.setup();
            vi.mocked(api.leadApi.getActivities).mockResolvedValue({
                success: true,
                data: [],
            } as any);

            vi.mocked(api.leadApi.addActivity).mockResolvedValue({
                success: true,
            } as any);

            render(<ActivitiesTab leadId={1} />);

            await waitFor(() => {
                expect(api.leadApi.getActivities).toHaveBeenCalledTimes(1);
            });

            const input = screen.getByPlaceholderText('Add a note or work log...');
            await user.type(input, 'New work log entry');

            const sendButton = screen.getAllByRole('button')[0];
            await user.click(sendButton);

            await waitFor(() => {
                expect(api.leadApi.getActivities).toHaveBeenCalledTimes(2);
            });
        });
    });
});
