import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TenderDashboard } from './components/TenderDashboard';
import { LeadDashboard } from './components/LeadDashboard';
import { TenderDetailsPage } from './components/TenderDetailsPage';
import { LeadDetailsPage } from './components/LeadDetailsPage';
import { PipelineView } from './components/PipelineView';
import { SalesDashboard } from './components/SalesDashboard';
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
import { ApiPlaygroundPage } from './components/ApiPlaygroundPage';
import { TeamStructurePage } from './components/TeamStructurePage';
import { SalesTargetsPage } from './components/SalesTargetsPage';
import { MyPerformancePage } from './components/MyPerformancePage';
import { CollateralRepository } from './components/CollateralRepository';
import { tokenManager, authApi } from './lib/api';
import { SessionManager } from './lib/security';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [tenderDetailsId, setTenderDetailsId] = useState<number | null>(null);
  const sessionManagerRef = useState(() => new SessionManager(30))[0];

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

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = tokenManager.getToken();
      if (token) {
        try {
          const response = await authApi.getCurrentUser();
          if (response.success) {
            setIsAuthenticated(true);
            setCurrentUser(response.data);
            // Reset session timer
            sessionManagerRef.resetTimer(() => {
              handleLogout();
            });
          } else {
            // Invalid token, clear it
            tokenManager.removeToken();
            setIsAuthenticated(false);
            setCurrentUser(null);
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
    } else if (view.startsWith('lead-details:')) {
      // Handle lead details navigation
      const leadId = parseInt(view.split(':')[1]);
      setTenderDetailsId(leadId);
      setCurrentView('lead-details');
    } else {
      setTenderDetailsId(null);
      setCurrentView(view);
    }
  };



  const handleLogin = async () => {
    setIsAuthenticated(true);
    try {
      const response = await authApi.getCurrentUser();
      if (response.success) setCurrentUser(response.data);
    } catch (e) { }

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
      case 'leads':
        return <LeadDashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
      case 'pipeline':
        return <PipelineView />;
      case 'sales-dashboard':
        return <SalesDashboard />;
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
      case 'api-playground':
        return <ApiPlaygroundPage />;
      case 'team-structure':
        return <TeamStructurePage />;
      case 'sales-targets':
        return <SalesTargetsPage />;
      case 'my-performance':
        return <MyPerformancePage user={currentUser} />;
      case 'collateral':
        return <CollateralRepository />;
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
      case 'lead-details':
        return tenderDetailsId ? (
          <LeadDetailsPage
            leadId={tenderDetailsId}
            onBack={() => {
              setCurrentView('leads');
              setTenderDetailsId(null);
            }}
            onUpdate={(lead) => {
              // Handle lead update if needed
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
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={currentUser}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}