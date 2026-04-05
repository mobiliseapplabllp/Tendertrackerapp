import { TeamStructureManager } from './TeamStructureManager';
import { Users } from 'lucide-react';

export function TeamStructurePage() {
  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Team Structure</h1>
              <p className="text-sm text-muted-foreground">Manage sales heads, team assignments, and product line ownership</p>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
        <TeamStructureManager />
      </div>
    </div>
  );
}
