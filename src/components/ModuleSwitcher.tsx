import { X, Search, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MODULES, getAccessibleModules } from '../lib/modules';

interface ModuleSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: string;
  onSelectModule: (moduleId: string) => void;
  userRole: string;
}

export function ModuleSwitcher({ isOpen, onClose, activeModule, onSelectModule, userRole }: ModuleSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) setSearchQuery('');
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modules = getAccessibleModules(userRole);
  const filtered = searchQuery.trim()
    ? modules.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : modules;

  const iconBgMap: Record<string, string> = {
    blue: 'bg-blue-100', indigo: 'bg-indigo-100', orange: 'bg-orange-100',
    pink: 'bg-pink-100', emerald: 'bg-emerald-100', gray: 'bg-gray-100',
  };
  const iconTextMap: Record<string, string> = {
    blue: 'text-blue-600', indigo: 'text-indigo-600', orange: 'text-orange-600',
    pink: 'text-pink-600', emerald: 'text-emerald-600', gray: 'text-gray-600',
  };
  const activeBorderMap: Record<string, string> = {
    blue: 'border-blue-400', indigo: 'border-indigo-400', orange: 'border-orange-400',
    pink: 'border-pink-400', emerald: 'border-emerald-400', gray: 'border-gray-400',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[70]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[71] bg-white rounded-2xl shadow-2xl border border-gray-200 w-[620px] max-w-[92vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-gray-900">Select Module</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-500">Choose a module to focus your workspace</p>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-gray-50/50"
              autoFocus
            />
          </div>
        </div>

        {/* Module Grid */}
        <div className="px-6 pb-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            {filtered.map(mod => {
              const isActive = mod.id === activeModule;
              const bgClass = iconBgMap[mod.color] || 'bg-gray-100';
              const textClass = iconTextMap[mod.color] || 'text-gray-600';
              const borderClass = activeBorderMap[mod.color] || 'border-gray-400';

              return (
                <button
                  key={mod.id}
                  onClick={() => { onSelectModule(mod.id); onClose(); }}
                  className={`relative text-left p-4 rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                    isActive
                      ? `${borderClass} bg-white shadow-md`
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  {/* Active checkmark */}
                  {isActive && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center mb-3`}>
                    <mod.icon className={`h-5 w-5 ${textClass}`} />
                  </div>

                  {/* Text */}
                  <p className="text-sm font-semibold text-gray-900">{mod.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{mod.description}</p>

                  {/* Item count */}
                  <p className="text-[11px] text-gray-400 mt-2">{mod.items.length} menu items</p>

                  {/* Active badge */}
                  {isActive && (
                    <span className="inline-block mt-2 text-[10px] font-bold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Currently Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No modules match "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/50 rounded-b-2xl">
          <p className="text-xs text-gray-400">
            Tip: Use <kbd className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-mono mx-0.5">Ctrl+M</kbd> to quickly switch modules
          </p>
          <button onClick={onClose} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </>
  );
}
