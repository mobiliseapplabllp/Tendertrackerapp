import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Settings } from '../components/Settings';
import { adminApi } from '../lib/api';

// Mock the API
vi.mock('../lib/api', () => ({
  adminApi: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
  },
}));

// Mock clearSettingsCache
vi.mock('../lib/settings', () => ({
  clearSettingsCache: vi.fn(),
}));

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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: {
    requestPermission: vi.fn(() => Promise.resolve('granted')),
    permission: 'default',
  },
});

describe('Settings Component', () => {
  beforeEach(() => {
    localStorageMock.setItem('auth_token', 'test-token');
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', async () => {
      (adminApi.getConfig as any).mockImplementation(() =>
        new Promise(() => {}) // Never resolves to keep loading
      );

      render(<Settings />);
      expect(screen.getByText('Loading settings...')).toBeInTheDocument();
    });

    it('should render all tabs when loaded', async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Company Settings')).toBeInTheDocument();
        expect(screen.getByText('Data Management')).toBeInTheDocument();
        expect(screen.getByText('Regional')).toBeInTheDocument();
        expect(screen.getByText('Security')).toBeInTheDocument();
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
        expect(screen.getByText('Desktop Notifications')).toBeInTheDocument();
      });
    });

    it('should show error message when API fails', async () => {
      (adminApi.getConfig as any).mockRejectedValue(new Error('API Error'));

      render(<Settings />);
      
      await waitFor(() => {
        const errorElement = screen.queryByText(/failed to load/i) || screen.queryByText(/api error/i);
        expect(errorElement).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show error when not authenticated', async () => {
      localStorageMock.removeItem('auth_token');
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText(/must be logged in/i)).toBeInTheDocument();
      });
    });
  });

  describe('Company Settings Tab', () => {
    beforeEach(async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });
    });

    it('should display company name and email fields', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/company email/i)).toBeInTheDocument();
      });
    });

    it('should update company name when input changes', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/company name/i) as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'Test Company' } });
        expect(nameInput.value).toBe('Test Company');
      });
    });

    it('should update company email when input changes', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/company email/i) as HTMLInputElement;
        fireEvent.change(emailInput, { target: { value: 'test@company.com' } });
        expect(emailInput.value).toBe('test@company.com');
      });
    });
  });

  describe('Data Management Tab', () => {
    beforeEach(async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });
    });

    it('should display auto-archive toggle', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Data Management')).toBeInTheDocument();
      });
      
      const dataTab = screen.getByText('Data Management');
      fireEvent.click(dataTab);
      
      await waitFor(() => {
        expect(screen.getByText(/auto-archive old tenders/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show archive days input when auto-archive is enabled', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Data Management')).toBeInTheDocument();
      });
      
      const dataTab = screen.getByText('Data Management');
      fireEvent.click(dataTab);
      
      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: /auto-archive/i });
        fireEvent.click(toggle);
      });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/archive after/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should display export, import, and backup buttons', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Data Management')).toBeInTheDocument();
      });
      
      const dataTab = screen.getByText('Data Management');
      fireEvent.click(dataTab);
      
      await waitFor(() => {
        expect(screen.getByText(/export data/i)).toBeInTheDocument();
        expect(screen.getByText(/import data/i)).toBeInTheDocument();
        expect(screen.getByText(/backup database/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Regional Settings Tab', () => {
    beforeEach(async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });
    });

    it('should display timezone, date format, and currency selectors', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Regional')).toBeInTheDocument();
      });
      
      const regionalTab = screen.getByText('Regional');
      fireEvent.click(regionalTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/timezone/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/date format/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should allow changing timezone', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Regional')).toBeInTheDocument();
      });
      
      const regionalTab = screen.getByText('Regional');
      fireEvent.click(regionalTab);
      
      await waitFor(() => {
        const timezoneSelect = screen.getByLabelText(/timezone/i);
        expect(timezoneSelect).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Security Settings Tab', () => {
    beforeEach(async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });
    });

    it('should display 2FA toggle', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });
      
      const securityTab = screen.getByText('Security');
      fireEvent.click(securityTab);
      
      await waitFor(() => {
        expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should display session timeout input', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });
      
      const securityTab = screen.getByText('Security');
      fireEvent.click(securityTab);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/session timeout/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should display password requirements', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Security')).toBeInTheDocument();
      });
      
      const securityTab = screen.getByText('Security');
      fireEvent.click(securityTab);
      
      await waitFor(() => {
        expect(screen.getByText(/password requirements/i)).toBeInTheDocument();
        expect(screen.getByText(/minimum length/i)).toBeInTheDocument();
        expect(screen.getByText(/require uppercase/i)).toBeInTheDocument();
        expect(screen.getByText(/require numbers/i)).toBeInTheDocument();
        expect(screen.getByText(/require special/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Email Notifications Tab', () => {
    beforeEach(async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });
    });

    it('should display email notifications master toggle', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      });
      
      const emailTab = screen.getByText('Email Notifications');
      fireEvent.click(emailTab);
      
      await waitFor(() => {
        expect(screen.getByText(/enable email notifications/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show individual notification toggles when master is enabled', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      });
      
      const emailTab = screen.getByText('Email Notifications');
      fireEvent.click(emailTab);
      
      await waitFor(() => {
        expect(screen.getByText(/tender created/i)).toBeInTheDocument();
        expect(screen.getByText(/tender updated/i)).toBeInTheDocument();
        expect(screen.getByText(/tender deadline/i)).toBeInTheDocument();
        expect(screen.getByText(/tender won/i)).toBeInTheDocument();
        expect(screen.getByText(/tender lost/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Desktop Notifications Tab', () => {
    beforeEach(async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });
    });

    it('should display desktop notifications master toggle', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Desktop Notifications')).toBeInTheDocument();
      });
      
      const desktopTab = screen.getByText('Desktop Notifications');
      fireEvent.click(desktopTab);
      
      await waitFor(() => {
        expect(screen.getByText(/enable desktop notifications/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should request notification permission when enabled', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        expect(screen.getByText('Desktop Notifications')).toBeInTheDocument();
      });
      
      const desktopTab = screen.getByText('Desktop Notifications');
      fireEvent.click(desktopTab);
      
      await waitFor(() => {
        const toggle = screen.getByRole('switch', { name: /enable desktop notifications/i });
        fireEvent.click(toggle);
      });
      
      await waitFor(() => {
        expect(window.Notification.requestPermission).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Save Functionality', () => {
    beforeEach(async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });
      (adminApi.updateConfig as any).mockResolvedValue({
        success: true,
        data: { configKey: 'test', configValue: 'test' },
      });
    });

    it('should save all settings when Save button is clicked', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(adminApi.updateConfig).toHaveBeenCalled();
      });
    });

    it('should show success message after saving', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error message if save fails', async () => {
      (adminApi.updateConfig as any).mockRejectedValue(new Error('Save failed'));

      render(<Settings />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });

    it('should reload settings after successful save', async () => {
      render(<Settings />);
      
      await waitFor(() => {
        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(adminApi.getConfig).toHaveBeenCalledTimes(2); // Initial load + reload after save
      });
    });
  });

  describe('Settings Loading from API', () => {
    it('should load and display settings from API', async () => {
      const mockConfigs = [
        { configKey: 'company_name', configValue: 'Test Company' },
        { configKey: 'company_email', configValue: 'test@company.com' },
        { configKey: 'timezone', configValue: 'Asia/Kolkata' },
        { configKey: 'currency', configValue: 'INR' },
        { configKey: 'two_factor_auth', configValue: 'true' },
        { configKey: 'session_timeout', configValue: '60' },
      ];

      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: mockConfigs,
      });

      render(<Settings />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/company name/i) as HTMLInputElement;
        expect(nameInput.value).toBe('Test Company');
      });
    });

    it('should handle empty config values gracefully', async () => {
      (adminApi.getConfig as any).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<Settings />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/company name/i) as HTMLInputElement;
        expect(nameInput.value).toBe('');
      });
    });
  });
});

