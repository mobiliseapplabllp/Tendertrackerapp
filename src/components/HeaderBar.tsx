import { LayoutGrid, LogOut, ChevronDown, Bell, Settings } from 'lucide-react';
import { MODULES } from '../lib/modules';
import { useBranding } from '../hooks/useBranding';
import { useState, useRef, useEffect } from 'react';

interface HeaderBarProps {
  activeModule: string;
  onModuleSwitcherToggle: () => void;
  user: any;
  onLogout: () => void;
}

export function HeaderBar({ activeModule, onModuleSwitcherToggle, user, onLogout }: HeaderBarProps) {
  const { appName } = useBranding();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentModule = MODULES.find(m => m.id === activeModule);
  const ModuleIcon = currentModule?.icon;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  // Ctrl+M keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        onModuleSwitcherToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onModuleSwitcherToggle]);

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const iconBgMap: Record<string, string> = {
    blue: 'bg-blue-600', indigo: 'bg-indigo-600', orange: 'bg-orange-500',
    pink: 'bg-pink-500', emerald: 'bg-emerald-600', gray: 'bg-gray-600',
  };

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">
      {/* Left: Logo + App Name + Module Selector */}
      <div className="flex items-center gap-4">
        {/* Logo + App Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-gray-900 leading-none">{appName || 'Mobilise CRM'}</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Business Intelligence Platform</p>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* Module Selector Pill */}
        <button
          onClick={onModuleSwitcherToggle}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
          title="Switch module (Ctrl+M)"
        >
          {currentModule && ModuleIcon && (
            <div className={`w-6 h-6 rounded-md ${iconBgMap[currentModule.color] || 'bg-gray-600'} flex items-center justify-center`}>
              <ModuleIcon className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">{currentModule?.name || 'Select Module'}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </div>

      {/* Right: Notifications + Settings + User */}
      <div className="flex items-center gap-1">
        <button className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" title="Notifications">
          <Bell className="h-[18px] w-[18px] text-gray-500" />
        </button>
        <button className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" title="Settings">
          <Settings className="h-[18px] w-[18px] text-gray-500" />
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        {/* User Avatar + Name */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {initials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-none">{user?.fullName || 'User'}</p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5 capitalize">{user?.role || 'User'}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-gray-400 hidden lg:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user?.fullName || 'User'}</p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email || ''}</p>
                <span className="inline-block mt-1.5 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold capitalize">{user?.role || 'User'}</span>
              </div>
              <div className="py-1">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
