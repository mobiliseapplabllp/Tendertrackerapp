import {
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import React, { useState } from 'react';
import { MODULES, type ModuleConfig } from '../lib/modules';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  user?: any;
  activeModule: string;
}

export function Sidebar({ currentView, onNavigate, onLogout, user, activeModule }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const role = (user?.role || 'User').toLowerCase();
  const isAdmin = role === 'admin';
  const isManager = ['manager', 'superadmin'].includes(role);
  const isUser = role === 'user';
  const isViewer = role === 'viewer';

  const canAccess = (menuId: string): boolean => {
    if (isAdmin) return true;
    if (isManager) {
      const systemOnly = ['users', 'categories', 'email-settings', 'administration', 'scout-config', 'api-playground', 'settings'];
      return !systemOnly.includes(menuId);
    }
    if (isUser || isViewer) {
      const allowed = ['dashboard', 'leads', 'sales-hub', 'tenders', 'documents', 'collateral',
        'reports', 'tender-scout', 'ai-search', 'companies', 'team-structure', 'sales-targets', 'product-catalog',
        'campaigns', 'social-media', 'email-marketing', 'content-calendar', 'lead-capture', 'campaign-analytics', 'audience-segments'];
      return allowed.includes(menuId);
    }
    return false;
  };

  const currentModule = MODULES.find(m => m.id === activeModule);
  const moduleItems = currentModule?.items || [];
  const visibleItems = moduleItems.filter(item => canAccess(item.id));

  const moduleIconColor: Record<string, string> = {
    blue: 'text-blue-600', indigo: 'text-indigo-600', orange: 'text-orange-600',
    pink: 'text-pink-600', emerald: 'text-emerald-600', gray: 'text-gray-600',
  };

  // Active item styling — filled background like AssetIQ
  const activeBg: Record<string, string> = {
    blue: 'bg-blue-600', indigo: 'bg-indigo-600', orange: 'bg-orange-500',
    pink: 'bg-pink-500', emerald: 'bg-emerald-600', gray: 'bg-gray-600',
  };

  const moduleColor = currentModule?.color || 'indigo';

  return (
    <div
      className={`${isCollapsed ? 'w-16' : 'w-60'} border-r border-gray-200 text-gray-900 flex flex-col transition-all duration-300 flex-shrink-0`}
      style={{
        minWidth: isCollapsed ? '64px' : '240px',
        maxWidth: isCollapsed ? '64px' : '240px',
        width: isCollapsed ? '64px' : '240px',
        backgroundColor: '#f8f9fb',
      }}
    >
      {/* Module Label */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        {!isCollapsed && currentModule && (
          <div className="flex items-center gap-2 min-w-0">
            <currentModule.icon className={`w-4 h-4 flex-shrink-0 ${moduleIconColor[moduleColor]}`} />
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">
              {currentModule.name}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex-shrink-0 w-6 h-6"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 pb-2 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px] ${
                  isActive
                    ? `${activeBg[moduleColor] || 'bg-indigo-600'} text-white font-semibold`
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 font-medium'
                }`}
                title={item.label}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {!isCollapsed && (
                  <span className="truncate text-left flex-1">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom: User + Logout */}
      <div className="px-3 py-3 flex-shrink-0 border-t border-gray-200">
        {!isCollapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {user.fullName ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800 truncate">{user.fullName || 'User'}</p>
              <p className="text-[10px] text-gray-400 capitalize">{user.role || 'User'}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-2 ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors text-[13px]`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
