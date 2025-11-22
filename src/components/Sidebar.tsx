import { 
  Home, 
  FileText, 
  Users, 
  Building2, 
  BarChart3, 
  Settings, 
  Bell,
  Tag,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useState } from 'react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export function Sidebar({ currentView, onNavigate, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard', badge: null },
    { id: 'tenders', icon: FileText, label: 'Tenders', badge: null },
    { id: 'documents', icon: FolderOpen, label: 'Document Management', badge: null },
    { id: 'users', icon: Users, label: 'User Management', badge: null },
    { id: 'companies', icon: Building2, label: 'Companies & Contacts', badge: null },
    { id: 'reports', icon: BarChart3, label: 'Reports & Analytics', badge: null },
    { id: 'categories', icon: Tag, label: 'Categories & Tags', badge: null },
  ];

  const bottomMenuItems = [
    { id: 'email-settings', icon: Bell, label: 'Email Alerts', badge: null },
    { id: 'administration', icon: ShieldCheck, label: 'Administration', badge: null },
    { id: 'settings', icon: Settings, label: 'Settings', badge: null },
  ];

  return (
    <div
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-gray-900 text-white flex flex-col transition-all duration-300 relative`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-xl">TenderTrack Pro</h1>
            <p className="text-xs text-gray-400">Tender Management System</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-gray-800 ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      <Separator className="bg-gray-700" />

      {/* Main Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <Separator className="bg-gray-700 my-4" />

        <div className="space-y-1">
          {bottomMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-2">
        <Separator className="bg-gray-700 mb-2" />
        {!isCollapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm">Current User</p>
            <p className="text-xs text-gray-400">admin@company.com</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={onLogout}
          className={`w-full ${
            isCollapsed ? 'px-2' : 'justify-start'
          } text-gray-300 hover:bg-red-600 hover:text-white`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
}