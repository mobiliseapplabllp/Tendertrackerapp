import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  BarChart3,
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  Users,
} from 'lucide-react';
import { DashboardStatCard } from './DashboardStatCard';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ScrollArea } from './ui/scroll-area';
import { dashboardApi } from '../lib/api';
import type { DashboardStats } from '../lib/types';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { formatCurrency } = useSettings();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getStats();
        if (response.success && response.data) {
          setStats(response.data);
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
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
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
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Tenders',
      value: stats.totalTenders.toString(),
      change: '',
      trend: 'up' as const,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Tenders',
      value: stats.activeTenders.toString(),
      change: '',
      trend: 'up' as const,
      icon: AlertCircle,
      color: 'bg-green-500',
    },
    {
      title: 'Won Tenders',
      value: stats.wonTenders.toString(),
      change: '',
      trend: 'up' as const,
      icon: CheckCircle2,
      color: 'bg-emerald-500',
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      change: '',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      title: 'Total EMD',
      value: formatCurrency(stats.totalEMD || 0) || 'N/A',
      change: '',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'bg-amber-500',
    },
    {
      title: 'Total Tender Fees',
      value: formatCurrency(stats.totalFees || 0) || 'N/A',
      change: '',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'bg-orange-500',
    },
    {
      title: 'Win Rate',
      value: `${stats.avgWinRate.toFixed(1)}%`,
      change: '',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
    {
      title: 'Upcoming Deadlines',
      value: stats.upcomingDeadlines.toString(),
      change: '',
      trend: 'up' as const,
      icon: Clock,
      color: 'bg-orange-500',
    },
  ];

  // Use real status data from API
  const statusData = stats.tendersByStatus.map((item: any) => ({
    name: item.status,
    value: item.count,
    color: item.status === 'Won' ? '#059669' :
      item.status === 'Lost' ? '#ef4444' :
        item.status === 'Draft' ? '#6b7280' :
          item.status === 'Submitted' ? '#8b5cf6' :
            item.status === 'Under Review' ? '#3b82f6' :
              item.status === 'Shortlisted' ? '#10b981' : '#f59e0b',
  }));

  // Use real category data from API
  const categoryData = stats.tendersByCategory || [];

  // Use real recent activities from API
  const recentActivities = stats.recentActivities || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      submitted: 'bg-purple-100 text-purple-800',
      won: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of tender activities and performance metrics
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {statsCards.map((stat, index) => {
              const rawValue = index === 3 ? stats.totalValue :
                index === 4 ? stats.totalEMD || 0 :
                  index === 5 ? stats.totalFees || 0 :
                    null;

              return (
                <DashboardStatCard
                  key={index}
                  title={stat.title}
                  value={stat.value}
                  rawValue={rawValue}
                  change={stat.change}
                  icon={stat.icon}
                  color={stat.color}
                  formatCurrency={formatCurrency}
                />
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card className="p-6">
              <h3 className="mb-4">Tenders by Category</h3>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={300} minWidth={400}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Tender Status Distribution */}
            <Card className="p-6">
              <h3 className="mb-4">Tender Status Distribution</h3>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={300} minWidth={400}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Recent Activities & Upcoming Deadlines */}
          <div className="grid grid-cols-3 gap-6">
            {/* Recent Activities */}
            <Card className="col-span-2 p-6">
              <h3 className="mb-4">Recent Activities</h3>
              <div className="space-y-3">
                {recentActivities.length > 0 ? (
                  recentActivities.slice(0, 5).map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium">{activity.user?.fullName || 'System'}</p>
                          <Badge variant="outline">{activity.activityType}</Badge>
                        </div>
                        <p className="text-sm">{activity.description || activity.tender?.title || 'Activity'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activities</p>
                )}
              </div>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Deadlines
              </h3>
              <div className="space-y-3">
                {stats.upcomingDeadlines > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {stats.upcomingDeadlines} tenders have upcoming deadlines in the next 30 days.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                )}
              </div>
            </Card>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
