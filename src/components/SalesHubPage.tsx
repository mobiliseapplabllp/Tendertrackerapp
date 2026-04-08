import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SalesDashboard } from './SalesDashboard';
import { SalesPerformanceOverview } from './SalesPerformanceOverview';
import { IndividualPerformance } from './IndividualPerformance';
import { PipelineView } from './PipelineView';
import { BarChart3, TrendingUp, User, Kanban } from 'lucide-react';

interface SalesHubPageProps {
  user?: any;
}

export function SalesHubPage({ user }: SalesHubPageProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b flex-shrink-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Sales Hub</h1>
              <p className="text-sm text-muted-foreground">Dashboard, performance, pipeline & analytics</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-6">
          <TabsList>
            <TabsTrigger value="dashboard" className="text-sm py-2.5 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />Dashboard
            </TabsTrigger>
            <TabsTrigger value="company" className="text-sm py-2.5 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />Company Performance
            </TabsTrigger>
            <TabsTrigger value="my-performance" className="text-sm py-2.5 flex items-center gap-1.5">
              <User className="w-4 h-4" />My Performance
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="text-sm py-2.5 flex items-center gap-1.5">
              <Kanban className="w-4 h-4" />Pipeline
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="dashboard" className="mt-0 h-full">
            <SalesDashboard />
          </TabsContent>

          <TabsContent value="company" className="mt-0 h-full">
            <SalesPerformanceOverview
              onNavigateToIndividual={(userId: number) => {
                setActiveTab('my-performance');
              }}
            />
          </TabsContent>

          <TabsContent value="my-performance" className="mt-0 h-full">
            <IndividualPerformance userId={user?.id} currentUser={user} />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-0 h-full">
            <PipelineView />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
