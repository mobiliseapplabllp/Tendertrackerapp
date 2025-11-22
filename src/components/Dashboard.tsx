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

export function Dashboard() {
  const stats = [
    {
      title: 'Total Tenders',
      value: '156',
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Open Tenders',
      value: '34',
      change: '+5',
      trend: 'up',
      icon: AlertCircle,
      color: 'bg-green-500',
    },
    {
      title: 'Won This Month',
      value: '12',
      change: '+3',
      trend: 'up',
      icon: CheckCircle2,
      color: 'bg-emerald-500',
    },
    {
      title: 'Total Value',
      value: '$12.5M',
      change: '+18%',
      trend: 'up',
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      title: 'Win Rate',
      value: '67%',
      change: '+4%',
      trend: 'up',
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
    {
      title: 'Avg Response Time',
      value: '8 days',
      change: '-2 days',
      trend: 'up',
      icon: Clock,
      color: 'bg-orange-500',
    },
  ];

  const monthlyData = [
    { month: 'Jan', tenders: 12, won: 8, lost: 4 },
    { month: 'Feb', tenders: 15, won: 10, lost: 5 },
    { month: 'Mar', tenders: 18, won: 13, lost: 5 },
    { month: 'Apr', tenders: 14, won: 9, lost: 5 },
    { month: 'May', tenders: 20, won: 14, lost: 6 },
    { month: 'Jun', tenders: 16, won: 11, lost: 5 },
  ];

  const statusData = [
    { name: 'Open', value: 34, color: '#10b981' },
    { name: 'In Progress', value: 28, color: '#3b82f6' },
    { name: 'Submitted', value: 22, color: '#8b5cf6' },
    { name: 'Won', value: 45, color: '#059669' },
    { name: 'Lost', value: 18, color: '#ef4444' },
    { name: 'Closed', value: 9, color: '#6b7280' },
  ];

  const recentTenders = [
    {
      id: 'TND-2025-089',
      title: 'Airport Expansion Project',
      client: 'City Airport Authority',
      value: '$2.3M',
      dueDate: '2025-12-15',
      status: 'open',
      priority: 'high',
    },
    {
      id: 'TND-2025-088',
      title: 'Healthcare IT System',
      client: 'Regional Hospital',
      value: '$850K',
      dueDate: '2025-12-01',
      status: 'in-progress',
      priority: 'medium',
    },
    {
      id: 'TND-2025-087',
      title: 'Road Infrastructure Upgrade',
      client: 'State Transport Dept',
      value: '$4.5M',
      dueDate: '2025-11-28',
      status: 'submitted',
      priority: 'high',
    },
    {
      id: 'TND-2025-086',
      title: 'School Renovation Project',
      client: 'Education Board',
      value: '$1.2M',
      dueDate: '2025-11-25',
      status: 'won',
      priority: 'low',
    },
  ];

  const upcomingDeadlines = [
    { tender: 'TND-2025-087', title: 'Road Infrastructure', daysLeft: 6 },
    { tender: 'TND-2025-088', title: 'Healthcare IT System', daysLeft: 9 },
    { tender: 'TND-2025-089', title: 'Airport Expansion', daysLeft: 23 },
  ];

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
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl mt-2">{stat.value}</p>
                    <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Monthly Tender Activity */}
            <Card className="p-6">
              <h3 className="mb-4">Monthly Tender Activity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tenders" fill="#3b82f6" name="Total Tenders" />
                  <Bar dataKey="won" fill="#10b981" name="Won" />
                  <Bar dataKey="lost" fill="#ef4444" name="Lost" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Tender Status Distribution */}
            <Card className="p-6">
              <h3 className="mb-4">Tender Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
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
            </Card>
          </div>

          {/* Recent Tenders & Upcoming Deadlines */}
          <div className="grid grid-cols-3 gap-6">
            {/* Recent Tenders */}
            <Card className="col-span-2 p-6">
              <h3 className="mb-4">Recent Tenders</h3>
              <div className="space-y-3">
                {recentTenders.map((tender) => (
                  <div
                    key={tender.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm text-muted-foreground">{tender.id}</p>
                        <Badge className={getPriorityColor(tender.priority)}>
                          {tender.priority}
                        </Badge>
                      </div>
                      <p>{tender.title}</p>
                      <p className="text-sm text-muted-foreground">{tender.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="mb-1">{tender.value}</p>
                      <Badge className={getStatusColor(tender.status)}>
                        {tender.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Due: {tender.dueDate}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Deadlines
              </h3>
              <div className="space-y-3">
                {upcomingDeadlines.map((item, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      {item.tender}
                    </p>
                    <p className="text-sm mb-2">{item.title}</p>
                    <Badge
                      className={
                        item.daysLeft <= 7
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }
                    >
                      {item.daysLeft} days left
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Team Performance */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Performance
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { name: 'John Smith', tenders: 23, won: 16, rate: '70%' },
                { name: 'Sarah Johnson', tenders: 19, won: 14, rate: '74%' },
                { name: 'Mike Davis', tenders: 18, won: 11, rate: '61%' },
                { name: 'Emily Brown', tenders: 15, won: 10, rate: '67%' },
              ].map((member, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <p className="mb-2">{member.name}</p>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Tenders: {member.tenders}
                    </p>
                    <p className="text-muted-foreground">Won: {member.won}</p>
                    <Badge className="bg-green-100 text-green-800 mt-2">
                      Win Rate: {member.rate}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
