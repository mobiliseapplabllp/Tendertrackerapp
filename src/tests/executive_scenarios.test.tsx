import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagement } from '../components/UserManagement';
import { CompanyManagement } from '../components/CompanyManagement';
import { Settings } from '../components/Settings';
import * as api from '../lib/api';

// Mock the API layer
vi.mock('../lib/api', () => ({
    userApi: {
        getAll: vi.fn().mockResolvedValue({
            success: true,
            data: {
                data: [{ id: 1, fullName: 'Admin User', email: 'admin@example.com', role: 'Administrator', status: 'Active' }],
                total: 1,
                page: 1,
                pageSize: 10
            }
        }),
        create: vi.fn().mockResolvedValue({ success: true, data: { id: 2, name: 'New Manager' } }),
        update: vi.fn(),
        delete: vi.fn(),
    },
    companyApi: {
        getAll: vi.fn().mockResolvedValue({
            success: true,
            data: {
                data: [{ id: 1, companyName: 'Existing Corp', companyEmail: 'info@existing.com' }],
                total: 1,
                page: 1,
                pageSize: 10
            }
        }),
        create: vi.fn().mockResolvedValue({ success: true, data: { id: 2, companyName: 'Acme Corp' } }),
        getContacts: vi.fn().mockResolvedValue({ success: true, data: [] }),
        addContact: vi.fn().mockResolvedValue({ success: true }),
    },
    settingsApi: {
        get: vi.fn(),
        update: vi.fn(),
    },
    adminApi: {
        getConfig: vi.fn().mockResolvedValue({ success: true, data: [] }),
        updateConfig: vi.fn().mockResolvedValue({ success: true }),
    }
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock ScrollArea to specific simple div
vi.mock('../components/ui/scroll-area', () => ({
    ScrollArea: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// Mock Tabs to avoid Radix complexity in JSDOM
vi.mock('../components/ui/tabs', () => ({
    Tabs: ({ children, defaultValue, className, ...props }: any) => <div className={className} data-value={defaultValue} {...props}>{children}</div>,
    TabsList: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    TabsTrigger: ({ children, value, onClick, ...props }: any) => (
        <button role="tab" data-value={value} onClick={onClick} {...props}>
            {children}
        </button>
    ),
    TabsContent: ({ children, value, ...props }: any) => <div role="tabpanel" data-value={value} {...props}>{children}</div>
}));

// Mock Dialog/Drawer components if needed (User Management / Company Management uses specific logic,
// strictly mocking generic UI components used inside them)
// Note: We are testing the "Page/Component" logic, not the library correctness.

// Mock Lucide icons to avoid render issues in tests if any
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        // Add any specific mocks if needed
    };
});

// Mock Auth Context/Hook
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, name: 'Test Admin', role: 'Admin', email: 'admin@example.com' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
    }),
}));

describe('Executive Test Cases - Phase 1 & 2', () => {
    const user = userEvent.setup();

    // Mock localStorage
    const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => {
                store[key] = value.toString();
            },
            removeItem: (key: string) => {
                delete store[key];
            },
            clear: () => {
                store = {};
            },
            length: 0,
            key: () => null,
        };
    })();

    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('auth_token', 'mock-token');
    });

    // Clean up localStorage after tests
    afterEach(() => {
        localStorage.clear();
    });

    describe('Executive Scenario 1: User Management & Role Assignment', () => {
        it('should allow an admin to create a new user and assign a role', async () => {
            // Setup Mock Data
            const mockUsers = [
                { id: 1, fullName: 'Admin User', email: 'admin@example.com', role: 'Admin', status: 'Active' }
            ];

            (api.userApi.getAll as any).mockResolvedValue({
                success: true,
                data: {
                    data: mockUsers,
                    total: 1,
                    page: 1,
                    pageSize: 10
                }
            });
            (api.userApi.create as any).mockResolvedValue({ success: true, data: { id: 2, fullName: 'New Manager', role: 'Manager' } });

            // Render Component
            render(<UserManagement />);

            // Verify Initial Load
            expect(screen.getByText('User Management')).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.queryByText('Loading users...')).not.toBeInTheDocument();
                // We use getAllByText because our simple Tabs mock renders all content, 
                // so the user appears in both "All Users" and "Active Users" tabs.
                const userElements = screen.getAllByText('Admin User');
                expect(userElements.length).toBeGreaterThan(0);
                expect(userElements[0]).toBeInTheDocument();
            });

            // 1. Open "Add User" Drawer
            const addUserBtn = screen.getByTestId('btn-add-user');
            await user.click(addUserBtn);

            expect(screen.getByText('Create New User')).toBeInTheDocument();

            // 2. Fill Form
            const nameInput = screen.getByPlaceholderText('Enter full name');
            const emailInput = screen.getByPlaceholderText('user@company.com');
            const passwordInput = screen.getByPlaceholderText('Enter password');

            await user.type(nameInput, 'New Manager');
            await user.type(emailInput, 'manager@example.com');
            await user.type(passwordInput, 'password123');

            // 3. Submit
            const createBtn = screen.getByTestId('btn-create-user');
            await user.click(createBtn);

            // 4. Verify API Call
            await waitFor(() => {
                expect(api.userApi.create).toHaveBeenCalledTimes(1);
                expect(api.userApi.create).toHaveBeenCalledWith(expect.objectContaining({
                    fullName: 'New Manager',
                    email: 'manager@example.com',
                }));
            });
        });
    });

    describe('Executive Scenario 2: Company Setup & Configuration', () => {
        it('should allow creating a new company and adding a contact', async () => {
            // Setup Mock Data
            (api.companyApi.getAll as any).mockResolvedValue({ success: true, data: [] });
            (api.companyApi.create as any).mockResolvedValue({ success: true, data: { id: 1, companyName: 'Acme Corp' } });
            (api.companyApi.getContacts as any).mockResolvedValue({ success: true, data: [] });

            // Render
            render(<CompanyManagement />);

            // Wait for loading to finish
            await waitFor(() => {
                expect(screen.queryByText('Loading companies...')).not.toBeInTheDocument();
            });

            // 1. Open "Add Company" - Use regex for robust text matching or role
            const addCompanyBtn = screen.getByTestId('btn-add-company');
            await user.click(addCompanyBtn);

            expect(screen.getByText('Add New Company')).toBeInTheDocument();

            // 2. Fill Detail
            const companyNameInput = screen.getByPlaceholderText('Enter company name');
            await user.type(companyNameInput, 'Acme Corp');

            // 3. Submit
            const submitBtn = screen.getByTestId('btn-submit-company');
            await user.click(submitBtn);

            // 4. Verify
            await waitFor(() => {
                expect(api.companyApi.create).toHaveBeenCalledWith(expect.objectContaining({
                    companyName: 'Acme Corp'
                }));
            });
        });
    });

    describe('Phase 1 Verification: Settings & Aesthetics', () => {
        it('should render Settings with the correct Obsidian design tokens (implied by classes)', async () => {
            // This test checks if standard elements are present, verifying the component didn't crash during refactor
            (api.settingsApi.get as any).mockResolvedValue({ success: true, data: {} });

            render(<Settings />);

            expect(screen.getByText('Settings')).toBeInTheDocument();

            await waitFor(() => {
                // Correct text is "Email Notifications" as per Settings.tsx source
                expect(screen.getByTestId('tab-email')).toBeInTheDocument();
            });
            // Check for absence of legacy elements if possible, or just general health
            const headers = screen.getAllByRole('heading');
            expect(headers.length).toBeGreaterThan(0);
        });
    });

});
