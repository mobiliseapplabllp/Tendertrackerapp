import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  BarChart3, FileText, TrendingUp, DollarSign, Clock,
  CheckCircle2, AlertCircle, XCircle, Calendar, Users, Crown, Loader2
} from 'lucide-react';
import { DashboardStatCard } from './DashboardStatCard';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ScrollArea } from './ui/scroll-area';
import { dashboardApi } from '../lib/api';
import type { DashboardStats } from '../lib/types';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('combined');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [expandedMembers, setExpandedMembers] = useState(false);
  const { formatCurrency } = useSettings();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getStats();
        if (response.success && response.data) {
          setStats(response.data);
          // Fetch team performance if sales head
          if (response.data.userContext?.isSalesHead) {
            const teamRes = await dashboardApi.getTeamPerformance();
            if (teamRes.success) setTeamMembers(teamRes.data || []);
          }
        } else {
          setError(response.error || 'Failed to load dashboard data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-6"><p className="text-muted-foreground">No data available</p></div>;
  }

  const userCtx = (stats as any).userContext || {};
  const isSalesHead = userCtx.isSalesHead;
  const isAdmin = userCtx.role === 'Admin';

  // Filter stats by lead_type_id for tabs
  // For now, same data for all tabs (backend already filters by role)
  // TODO: Backend can return separate tender/lead stats when lead_type_id filter is added

  const statusData = (stats.tendersByStatus || []).map((item: any) => ({
    name: item.status,
    value: item.count,
    color: item.status === 'Won' ? '#059669' :
      item.status === 'Lost' ? '#ef4444' :
      item.status === 'Draft' ? '#6b7280' :
      item.status === 'Submitted' ? '#8b5cf6' :
      item.status === 'Under Review' ? '#3b82f6' :
      item.status === 'Shortlisted' ? '#10b981' : '#f59e0b',
  }));

  const categoryData = stats.tendersByCategory || [];
  const recentActivities = stats.recentActivities || [];

  const StatsGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <DashboardStatCard title="Total" value={stats.totalTenders.toString()} icon={FileText} color="bg-blue-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Active" value={stats.activeTenders.toString()} icon={AlertCircle} color="bg-green-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Won" value={stats.wonTenders.toString()} icon={CheckCircle2} color="bg-emerald-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Total Value" value={formatCurrency(stats.totalValue)} rawValue={stats.totalValue} icon={DollarSign} color="bg-purple-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="EMD" value={formatCurrency(stats.totalEMD || 0) || 'N/A'} rawValue={stats.totalEMD || 0} icon={DollarSign} color="bg-amber-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Fees" value={formatCurrency(stats.totalFees || 0) || 'N/A'} rawValue={stats.totalFees || 0} icon={DollarSign} color="bg-orange-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Win Rate" value={`${(stats.avgWinRate || 0).toFixed(1)}%`} icon={TrendingUp} color="bg-indigo-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Deadlines" value={stats.upcomingDeadlines.toString()} icon={Clock} color="bg-red-500" formatCurrency={formatCurrency} />
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? 'Organization-wide overview' :
               isSalesHead ? `Your product line performance (${userCtx.teamMemberCount || 0} team members)` :
               'Your personal performance metrics'}
            </p>
          </div>
          {/* Role Badge */}
          <div className="flex items-center gap-2">
            {isSalesHead && (
              <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                <Crown className="w-3 h-3" />Sales Head
              </Badge>
            )}
            {isAdmin && (
              <Badge className="bg-indigo-100 text-indigo-800">Admin</Badge>
            )}
            {!isAdmin && !isSalesHead && (
              <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
                <Users className="w-3 h-3" />{userCtx.fullName || 'Team Member'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-6">
          <TabsList>
            <TabsTrigger value="combined" className="text-sm py-2.5 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />Combined
            </TabsTrigger>
            <TabsTrigger value="tenders" className="text-sm py-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />Tenders
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-sm py-2.5 flex items-center gap-1.5">
              <Users className="w-4 h-4" />Leads
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Combined Tab */}
          <TabsContent value="combined" className="mt-0 p-6 space-y-6">
            <StatsGrid />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="mb-4 font-medium">By Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-6">
                <h3 className="mb-4 font-medium">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={95} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Team Performance (Sales Head only) */}
            {isSalesHead && teamMembers.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />My Team Performance
                  </h3>
                  <button onClick={() => setExpandedMembers(!expandedMembers)}
                    className="text-xs text-indigo-600 hover:underline">
                    {expandedMembers ? 'Collapse' : `Show all ${teamMembers.length} members`}
                  </button>
                </div>
                {/* Summary row */}
                <div className="grid grid-cols-5 gap-3 mb-3 text-center">
                  <div className="bg-blue-50 rounded-lg p-2"><p className="text-lg font-bold text-blue-700">{teamMembers.reduce((s, m) => s + (m.tender_count || 0), 0)}</p><p className="text-xs text-blue-600">Tenders</p></div>
                  <div className="bg-green-50 rounded-lg p-2"><p className="text-lg font-bold text-green-700">{teamMembers.reduce((s, m) => s + (m.lead_count || 0), 0)}</p><p className="text-xs text-green-600">Leads</p></div>
                  <div className="bg-emerald-50 rounded-lg p-2"><p className="text-lg font-bold text-emerald-700">{teamMembers.reduce((s, m) => s + (m.won_count || 0), 0)}</p><p className="text-xs text-emerald-600">Won</p></div>
                  <div className="bg-purple-50 rounded-lg p-2"><p className="text-lg font-bold text-purple-700">{formatCurrency(teamMembers.reduce((s, m) => s + parseFloat(m.total_value || 0), 0))}</p><p className="text-xs text-purple-600">Total Value</p></div>
                  <div className="bg-amber-50 rounded-lg p-2"><p className="text-lg font-bold text-amber-700">{formatCurrency(teamMembers.reduce((s, m) => s + parseFloat(m.won_value || 0), 0))}</p><p className="text-xs text-amber-600">Won Value</p></div>
                </div>
                {/* Individual members */}
                {expandedMembers && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Member</th>
                          <th className="px-3 py-2 text-right">Tenders</th>
                          <th className="px-3 py-2 text-right">Leads</th>
                          <th className="px-3 py-2 text-right">Won</th>
                          <th className="px-3 py-2 text-right">Total Value</th>
                          <th className="px-3 py-2 text-right">Won Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((m: any) => (
                          <tr key={m.id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                                  {(m.full_name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                  <p className="font-medium text-xs">{m.full_name}</p>
                                  <p className="text-xs text-gray-500">{m.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">{m.tender_count || 0}</td>
                            <td className="px-3 py-2 text-right">{m.lead_count || 0}</td>
                            <td className="px-3 py-2 text-right font-medium text-green-600">{m.won_count || 0}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(parseFloat(m.total_value || 0))}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(parseFloat(m.won_value || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* Recent Activities */}
            <Card className="p-6">
              <h3 className="mb-4 font-medium">Recent Activities</h3>
              <div className="space-y-2">
                {recentActivities.length > 0 ? (
                  recentActivities.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">{activity.user_name || activity.user?.fullName || 'System'}</p>
                          <Badge variant="outline" className="text-xs">{activity.activity_type || activity.activityType}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{activity.description || activity.tender_title || 'Activity'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(activity.created_at || activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activities</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Tenders Tab */}
          <TabsContent value="tenders" className="mt-0 p-6 space-y-6">
            <StatsGrid />
            <Card className="p-6">
              <h3 className="mb-4 font-medium">Tender Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="mt-0 p-6 space-y-6">
            <StatsGrid />
            <Card className="p-6">
              <h3 className="mb-4 font-medium">Lead Categories</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
