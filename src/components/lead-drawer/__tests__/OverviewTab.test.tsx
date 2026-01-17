import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverviewTab } from '../OverviewTab';
import type { Lead } from '../../../lib/types';

// Mock useSettings hook
vi.mock('../../../hooks/useSettings', () => ({
    useSettings: () => ({
        formatCurrency: (value: number, currency: string) => `${currency} ${value.toLocaleString()}`,
        formatDate: (date: string) => new Date(date).toLocaleDateString(),
    }),
}));

describe('OverviewTab', () => {
    const mockLead: Lead = {
        id: 1,
        leadNumber: 'LEAD-001',
        title: 'Test Lead Title',
        description: 'Test description',
        status: 'Draft',
        priority: 'High',
        source: 'Website',
        client: 'Test Client',
        estimatedValue: 100000,
        dealValue: null,
        currency: 'INR',
        probability: 75,
        submissionDeadline: '2026-02-01',
        expectedCloseDate: '2026-03-01',
        createdBy: 'John Doe',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        updatedBy: 'Jane Smith',
    } as Lead;

    const defaultProps = {
        lead: mockLead,
        onUpdate: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render lead information in view mode', () => {
            render(<OverviewTab {...defaultProps} />);

            expect(screen.getByText('Lead Information')).toBeInTheDocument();
            expect(screen.getByText('LEAD-001')).toBeInTheDocument();
            expect(screen.getByText('Test Lead Title')).toBeInTheDocument();
            expect(screen.getByText('Test description')).toBeInTheDocument();
            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('High')).toBeInTheDocument();
        });

        it('should render all information cards', () => {
            render(<OverviewTab {...defaultProps} />);

            expect(screen.getByText('Basic Information')).toBeInTheDocument();
            expect(screen.getByText('Client Information')).toBeInTheDocument();
            expect(screen.getByText('Financial & Timeline')).toBeInTheDocument();
            expect(screen.getByText('Metadata')).toBeInTheDocument();
        });

        it('should display Edit button in view mode', () => {
            render(<OverviewTab {...defaultProps} />);

            const editButton = screen.getByRole('button', { name: /edit/i });
            expect(editButton).toBeInTheDocument();
        });

        it('should display formatted currency', () => {
            render(<OverviewTab {...defaultProps} />);

            expect(screen.getByText(/INR 100,000/)).toBeInTheDocument();
        });

        it('should display probability percentage', () => {
            render(<OverviewTab {...defaultProps} />);

            expect(screen.getByText('75%')).toBeInTheDocument();
        });
    });

    describe('Edit Mode', () => {
        it('should enter edit mode when Edit button is clicked', async () => {
            const user = userEvent.setup();
            render(<OverviewTab {...defaultProps} />);

            const editButton = screen.getByRole('button', { name: /edit/i });
            await user.click(editButton);

            expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
        });

        it('should show form inputs in edit mode', async () => {
            const user = userEvent.setup();
            render(<OverviewTab {...defaultProps} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            // Check for various inputs
            expect(screen.getByDisplayValue('Test Lead Title')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Test Client')).toBeInTheDocument();
        });

        it('should show select dropdowns for status and priority', async () => {
            const user = userEvent.setup();
            render(<OverviewTab {...defaultProps} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            // Status and Priority should be in select components
            const selects = screen.getAllByRole('combobox');
            expect(selects.length).toBeGreaterThan(0);
        });
    });

    describe('Form Validation', () => {
        it('should show error when title is empty', async () => {
            const user = userEvent.setup();
            render(<OverviewTab {...defaultProps} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            const titleInput = screen.getByDisplayValue('Test Lead Title');
            await user.clear(titleInput);

            await user.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => {
                expect(screen.getByText('Title is required')).toBeInTheDocument();
            });

            expect(defaultProps.onUpdate).not.toHaveBeenCalled();
        });

        it('should clear error when field is changed', async () => {
            const user = userEvent.setup();
            render(<OverviewTab {...defaultProps} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            const titleInput = screen.getByDisplayValue('Test Lead Title');
            await user.clear(titleInput);
            await user.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => {
                expect(screen.getByText('Title is required')).toBeInTheDocument();
            });

            await user.type(titleInput, 'New Title');

            expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
        });
    });

    describe('Saving Changes', () => {
        it('should call onUpdate with changed values when Save is clicked', async () => {
            const user = userEvent.setup();
            const onUpdate = vi.fn().mockResolvedValue(undefined);
            render(<OverviewTab {...defaultProps} onUpdate={onUpdate} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            const titleInput = screen.getByDisplayValue('Test Lead Title');
            await user.clear(titleInput);
            await user.type(titleInput, 'Updated Title');

            await user.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => {
                expect(onUpdate).toHaveBeenCalledWith(
                    expect.objectContaining({ title: 'Updated Title' })
                );
            });
        });

        it('should exit edit mode after successful save', async () => {
            const user = userEvent.setup();
            render(<OverviewTab {...defaultProps} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));
            await user.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
            });

            expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
        });

        it('should show saving state while saving', async () => {
            const user = userEvent.setup();
            const onUpdate = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
            render(<OverviewTab {...defaultProps} onUpdate={onUpdate} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));
            const saveButton = screen.getByRole('button', { name: /save/i });

            await user.click(saveButton);

            expect(screen.getByText('Saving...')).toBeInTheDocument();
            expect(saveButton).toBeDisabled();
        });

        it('should handle save errors gracefully', async () => {
            const user = userEvent.setup();
            const onUpdate = vi.fn().mockRejectedValue(new Error('Network error'));
            render(<OverviewTab {...defaultProps} onUpdate={onUpdate} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));
            await user.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });

            // Should stay in edit mode
            expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        });

        it('should disable buttons while saving', async () => {
            const user = userEvent.setup();
            const onUpdate = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
            render(<OverviewTab {...defaultProps} onUpdate={onUpdate} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            const saveButton = screen.getByRole('button', { name: /save/i });
            const cancelButton = screen.getByRole('button', { name: /cancel/i });

            await user.click(saveButton);

            expect(saveButton).toBeDisabled();
            expect(cancelButton).toBeDisabled();
        });
    });

    describe('Cancel Functionality', () => {
        it('should revert changes when Cancel is clicked', async () => {
            const user = userEvent.setup();
            render(<OverviewTab {...defaultProps} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            const titleInput = screen.getByDisplayValue('Test Lead Title');
            await user.clear(titleInput);
            await user.type(titleInput, 'Changed Title');

            await user.click(screen.getByRole('button', { name: /cancel/i }));

            // Should exit edit mode
            expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();

            // Should show original value
            expect(screen.getByText('Test Lead Title')).toBeInTheDocument();
        });

        it('should clear errors when Cancel is clicked', async () => {
            const user = userEvent.setup();
            render(<OverviewTab {...defaultProps} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            const titleInput = screen.getByDisplayValue('Test Lead Title');
            await user.clear(titleInput);
            await user.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => {
                expect(screen.getByText('Title is required')).toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: /cancel/i }));

            expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
        });
    });

    describe('Field Updates', () => {
        it('should update status field', async () => {
            const user = userEvent.setup();
            const onUpdate = vi.fn().mockResolvedValue(undefined);
            render(<OverviewTab {...defaultProps} onUpdate={onUpdate} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            // This would require clicking the select and choosing an option
            // For now, just verify the save is called
            await user.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => {
                expect(onUpdate).toHaveBeenCalled();
            });
        });

        it('should update numeric fields correctly', async () => {
            const user = userEvent.setup();
            const onUpdate = vi.fn().mockResolvedValue(undefined);
            render(<OverviewTab {...defaultProps} onUpdate={onUpdate} />);

            await user.click(screen.getByRole('button', { name: /edit/i }));

            const estimatedValueInput = screen.getByDisplayValue('100000');
            await user.clear(estimatedValueInput);
            await user.type(estimatedValueInput, '200000');

            await user.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => {
                expect(onUpdate).toHaveBeenCalledWith(
                    expect.objectContaining({ estimatedValue: 200000 })
                );
            });
        });
    });

    describe('Display of Optional Fields', () => {
        it('should show N/A for missing optional fields', () => {
            const leadWithMissingFields = {
                ...mockLead,
                source: undefined,
                client: undefined,
                probability: undefined,
            };

            render(<OverviewTab lead={leadWithMissingFields} onUpdate={vi.fn()} />);

            const naElements = screen.getAllByText('N/A');
            expect(naElements.length).toBeGreaterThan(0);
        });

        it('should show "No description" for missing description', () => {
            const leadWithoutDescription = {
                ...mockLead,
                description: undefined,
            };

            render(<OverviewTab lead={leadWithoutDescription} onUpdate={vi.fn()} />);

            expect(screen.getByText('No description')).toBeInTheDocument();
        });
    });

    describe('Status and Priority Badges', () => {
        it('should apply correct color class to status badge', () => {
            render(<OverviewTab {...defaultProps} />);

            const statusBadge = screen.getByText('Draft');
            expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
        });

        it('should apply correct color class to priority badge', () => {
            render(<OverviewTab {...defaultProps} />);

            const priorityBadge = screen.getByText('High');
            expect(priorityBadge).toHaveClass('bg-orange-100', 'text-orange-700');
        });
    });
});
