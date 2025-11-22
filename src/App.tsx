import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TenderDashboard } from './components/TenderDashboard';
import { DocumentManagement } from './components/DocumentManagement';
import { UserManagement } from './components/UserManagement';
import { CompanyManagement } from './components/CompanyManagement';
import { ReportsAnalytics } from './components/ReportsAnalytics';
import { CategoryManagement } from './components/CategoryManagement';
import { EmailConfigDialog } from './components/EmailConfigDialog';
import { Administration } from './components/Administration';
import { Settings } from './components/Settings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);

  const handleNavigate = (view: string) => {
    if (view === 'email-settings') {
      setIsEmailSettingsOpen(true);
    } else {
      setCurrentView(view);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tenders':
        return <TenderDashboard onLogout={handleLogout} />;
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
      case 'administration':
        return <Administration />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
      <EmailConfigDialog
        isOpen={isEmailSettingsOpen}
        onClose={() => setIsEmailSettingsOpen(false)}
      />
    </div>
  );
}