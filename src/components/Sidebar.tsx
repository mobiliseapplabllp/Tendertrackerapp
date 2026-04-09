import {
  Home,
  FileText,
  Users,
  Building2,
  Target,
  FolderArchive,
  BarChart3,
  Settings,
  Bell,
  Tag,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ShieldCheck,
  Search,
  Globe,
  TrendingUp,
  Terminal,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import React, { useState } from 'react';
import { useBranding } from '../hooks/useBranding';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  user?: any;
}

export function Sidebar({ currentView, onNavigate, onLogout, user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { appName } = useBranding();

  const role = (user?.role || 'User').toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = ['manager', 'superadmin'].includes(role);
  const isUser = role === 'user';
  const isViewer = role === 'viewer';
  const isAdminOrManager = isAdmin || isManager;

  // Menu item access control
  const canAccess = (menuId: string): boolean => {
    // Admin sees everything
    if (isAdmin) return true;

    // Manager sees everything except System Settings
    if (isManager) {
      const systemOnly = ['users', 'categories', 'email-settings', 'administration', 'scout-config', 'api-playground', 'settings'];
      return !systemOnly.includes(menuId);
    }

    // User sees: Dashboard, Leads, Sales Hub, Tenders, Documents, Collateral
    if (isUser || isViewer) {
      const allowed = ['dashboard', 'leads', 'sales-hub', 'tenders', 'documents', 'collateral'];
      return allowed.includes(menuId);
    }

    return false;
  };

  const canAccessPlayground = isAdmin;

  const menuSections = [
    {
      label: 'Overview',
      items: [
        { id: 'dashboard', icon: Home, label: 'Dashboard', badge: null },
        { id: 'reports', icon: BarChart3, label: 'Reports & Analytics', badge: null },
      ]
    },
    {
      label: 'Tender Management',
      items: [
        { id: 'tenders', icon: FileText, label: 'Tender Master', badge: null },
        { id: 'tender-scout', icon: Search, label: 'Tender Scout', badge: null },
        { id: 'ai-search', icon: Globe, label: 'AI Search', badge: null },
      ]
    },
    {
      label: 'CRM & Sales',
      items: [
        { id: 'leads', icon: FileText, label: 'Leads', badge: null },
        { id: 'sales-hub', icon: TrendingUp, label: 'Sales Hub', badge: null },
        { id: 'companies', icon: Building2, label: 'Companies & Contacts', badge: null },
        { id: 'team-structure', icon: Users, label: 'Team Structure', badge: null },
        { id: 'sales-targets', icon: Target, label: 'Sales Targets', badge: null },
        { id: 'product-catalog', icon: Tag, label: 'Product Catalog', badge: null },
      ]
    },
    {
      label: 'Document Management',
      items: [
        { id: 'documents', icon: FolderOpen, label: 'Documents', badge: null },
        { id: 'collateral', icon: FolderArchive, label: 'Collateral Repository', badge: null },
      ]
    },
  ];

  const bottomSections = [
    {
      label: 'System Settings',
      items: [
        { id: 'users', icon: Users, label: 'User Management', badge: null },
        { id: 'categories', icon: Tag, label: 'Categories & Tags', badge: null },
        { id: 'email-settings', icon: Bell, label: 'Email Alerts', badge: null },
        { id: 'administration', icon: ShieldCheck, label: 'Administration', badge: null },
        { id: 'scout-config', icon: Settings, label: 'Scout Configuration', badge: null },
        ...(canAccessPlayground ? [{ id: 'api-playground', icon: Terminal, label: 'API Playground', badge: null }] : []),
        { id: 'settings', icon: Settings, label: 'Settings', badge: null },
      ]
    }
  ];

  return (
    <div
      className={`${isCollapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-gray-200 text-gray-900 flex flex-col transition-all duration-300 relative sticky top-0 h-screen flex-shrink-0 min-w-0 max-w-full`}
      style={{
        minWidth: isCollapsed ? '64px' : '256px',
        maxWidth: isCollapsed ? '64px' : '256px',
        width: isCollapsed ? '64px' : '256px'
      }}
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between flex-shrink-0" style={{ minWidth: 0 }}>
        {!isCollapsed && (
          <div className="min-w-0 flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
            <h1
              className="text-sm font-semibold tracking-tight"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {appName}
            </h1>
            <p
              className="text-xs text-gray-500"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              Lead Management System
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:bg-gray-100 hover:text-gray-900 flex-shrink-0 w-6 h-6"
          style={{ flexShrink: 0 }}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      <Separator className="bg-gray-200" />

      {/* Main Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden min-w-0">
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(item => canAccess(item.id));
          if (visibleItems.length === 0) return null;
          return (
          <div key={section.label} className={idx > 0 ? 'mt-4' : ''}>
            {!isCollapsed && (
              <h2 className="px-2.5 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.label}
              </h2>
            )}
            <div className="space-y-0.5">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-sm ${currentView === item.id
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  title={item.label}
                  style={{ minWidth: 0 }}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${currentView === item.id ? 'text-gray-900' : 'text-gray-500'}`} style={{ flexShrink: 0 }} />
                  {!isCollapsed && (
                    <span
                      className="truncate text-left flex-1"
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="ml-auto bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          );
        })}

        {/* System Settings - Admin only */}
        {isAdmin && <Separator className="bg-gray-200 my-4" />}

        {bottomSections.map((section) => {
          if (!isAdmin) return null;
          return (
          <div key={section.label}>
            {!isCollapsed && (
              <h2 className="px-2.5 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.label}
              </h2>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                // RBAC Filter
                // if (item.id === 'api-playground' && !canAccessPlayground) return null;

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-sm ${currentView === item.id
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    title={item.label}
                    style={{ minWidth: 0 }}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${currentView === item.id ? 'text-gray-900' : 'text-gray-500'}`} style={{ flexShrink: 0 }} />
                    {!isCollapsed && (
                      <span
                        className="truncate text-left flex-1"
                        style={{
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span className="ml-auto bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-2 flex-shrink-0" style={{ minWidth: 0 }}>
        <Separator className="bg-gray-200 mb-2" />
        {!isCollapsed && (
          <div className="px-2.5 py-1.5 mb-1" style={{ minWidth: 0, overflow: 'hidden' }}>
            <p
              className="text-sm font-medium"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              Current User
            </p>
            <p
              className="text-xs text-gray-500"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={onLogout}
          className={`w-full ${isCollapsed ? 'px-2' : 'justify-start px-2.5'
            } text-gray-600 hover:bg-gray-100 hover:text-red-600 h-8 text-sm`}
          title="Logout"
          style={{ minWidth: 0 }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" style={{ flexShrink: 0 }} />
          {!isCollapsed && (
            <span
              className="ml-2 flex-1 text-left"
              style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              Logout
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}