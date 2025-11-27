import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TenderDashboard } from './components/TenderDashboard';
import { TenderDetailsPage } from './components/TenderDetailsPage';
import { DocumentManagement } from './components/DocumentManagement';
import { UserManagement } from './components/UserManagement';
import { CompanyManagement } from './components/CompanyManagement';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { CategoryManagement } from './components/CategoryManagement';
import { EmailAlerts } from './components/EmailConfigDialog';
import { Administration } from './components/Administration';
import { Settings } from './components/Settings';
import { TenderScout } from './components/TenderScout';
import { ScoutConfig } from './components/ScoutConfig';
import { AISearch } from './components/AISearch';
import { tokenManager, authApi } from './lib/api';
import { SessionManager } from './lib/security';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [tenderDetailsId, setTenderDetailsId] = useState<number | null>(null);
  const sessionManagerRef = useState(() => new SessionManager(30))[0];

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenManager.getToken();
      if (token) {
        try {
          const response = await authApi.getCurrentUser();
          if (response.success) {
            setIsAuthenticated(true);
            // Reset session timer
            sessionManagerRef.resetTimer(() => {
              handleLogout();
            });
          } else {
            // Invalid token, clear it
            tokenManager.removeToken();
            setIsAuthenticated(false);
          }
        } catch (error) {
          tokenManager.removeToken();
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  // Set up session timeout
  useEffect(() => {
    if (isAuthenticated) {
      sessionManagerRef.resetTimer(() => {
        handleLogout();
      });

      // Reset timer on user activity
      const handleActivity = () => {
        sessionManagerRef.resetTimer(() => {
          handleLogout();
        });
      };

      window.addEventListener('mousedown', handleActivity);
      window.addEventListener('keydown', handleActivity);

      return () => {
        window.removeEventListener('mousedown', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        sessionManagerRef.clearTimer();
      };
    }
  }, [isAuthenticated]);

  const handleNavigate = (view: string) => {
    // Handle tender details navigation
    if (view.startsWith('tender-details:')) {
      const tenderId = parseInt(view.split(':')[1]);
      setTenderDetailsId(tenderId);
      setCurrentView('tender-details');
    } else {
      setTenderDetailsId(null);
      setCurrentView(view);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
    }
    tokenManager.removeToken();
    sessionManagerRef.clearTimer();
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    sessionManagerRef.resetTimer(() => {
      handleLogout();
    });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tenders':
        return <TenderDashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
      case 'documents':
        return <DocumentManagement />;
      case 'users':
        return <UserManagement />;
      case 'companies':
        return <CompanyManagement />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'categories':
        return <CategoryManagement />;
      case 'tender-scout':
        return <TenderScout />;
      case 'scout-config':
        return <ScoutConfig />;
      case 'ai-search':
        return <AISearch />;
      case 'administration':
        return <Administration />;
      case 'settings':
        return <Settings />;
      case 'email-settings':
        return <EmailAlerts />;
      case 'tender-details':
        return tenderDetailsId ? (
          <TenderDetailsPage
            tenderId={tenderDetailsId}
            onBack={() => {
              setCurrentView('tenders');
              setTenderDetailsId(null);
            }}
            onUpdate={(tender) => {
              // Handle tender update if needed
            }}
          />
        ) : (
          <Dashboard />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col">
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}