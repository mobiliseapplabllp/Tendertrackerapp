import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  BarChart3,
  Download,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';

export function ReportsAnalytics() {
  const quarterlyPerformance = [
    { quarter: 'Q1 2024', tenders: 45, won: 28, revenue: 8.5 },
    { quarter: 'Q2 2024', tenders: 52, won: 35, revenue: 12.3 },
    { quarter: 'Q3 2024', tenders: 48, won: 32, revenue: 10.8 },
    { quarter: 'Q4 2024', tenders: 56, won: 38, revenue: 14.2 },
  ];

  const industryBreakdown = [
    { industry: 'Transportation', count: 28, value: 15.2 },
    { industry: 'Healthcare', count: 22, value: 12.8 },
    { industry: 'Infrastructure', count: 35, value: 22.5 },
    { industry: 'Education', count: 18, value: 8.3 },
    { industry: 'Energy', count: 25, value: 18.7 },
    { industry: 'Technology', count: 15, value: 9.5 },
  ];

  const winRateTrend = [
    { month: 'Jan', rate: 62 },
    { month: 'Feb', rate: 65 },
    { month: 'Mar', rate: 68 },
    { month: 'Apr', rate: 64 },
    { month: 'May', rate: 70 },
    { month: 'Jun', rate: 67 },
    { month: 'Jul', rate: 69 },
    { month: 'Aug', rate: 72 },
    { month: 'Sep', rate: 71 },
    { month: 'Oct', rate: 74 },
    { month: 'Nov', rate: 73 },
    { month: 'Dec', rate: 75 },
  ];

  const topClients = [
    { name: 'City Airport Authority', tenders: 12, won: 9, value: '$8.5M' },
    { name: 'State Transport Dept', tenders: 10, won: 7, value: '$6.2M' },
    { name: 'Regional Hospital', tenders: 8, won: 6, value: '$4.8M' },
    { name: 'Education Board', tenders: 7, won: 5, value: '$3.5M' },
    { name: 'Energy Corporation', tenders: 6, won: 4, value: '$5.1M' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Reports & Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive insights and performance analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select defaultValue="2024">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Key Metrics Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-3xl">$45.8M</p>
              <p className="text-sm text-green-600 mt-1">+22% YoY</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Tenders</p>
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-3xl">201</p>
              <p className="text-sm text-blue-600 mt-1">+15% YoY</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-3xl">68%</p>
              <p className="text-sm text-purple-600 mt-1">+5% YoY</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                <DollarSign className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-3xl">$228K</p>
              <p className="text-sm text-orange-600 mt-1">+12% YoY</p>
            </Card>
          </div>

          {/* Quarterly Performance */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Quarterly Performance</h3>
              <Badge className="bg-blue-100 text-blue-800">Year 2024</Badge>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={quarterlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="tenders"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  name="Total Tenders"
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="won"
                  stackId="2"
                  stroke="#10b981"
                  fill="#10b981"
                  name="Tenders Won"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Revenue ($M)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Industry Breakdown & Win Rate Trend */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="mb-4">Industry Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={industryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="industry" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Tender Count" />
                  <Bar dataKey="value" fill="#10b981" name="Value ($M)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4">Win Rate Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={winRateTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    name="Win Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top Clients Performance */}
          <Card className="p-6">
            <h3 className="mb-4">Top Clients by Performance</h3>
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p>{client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {client.tenders} tenders • {client.won} won
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg">{client.value}</p>
                    <Badge className="bg-green-100 text-green-800">
                      {Math.round((client.won / client.tenders) * 100)}% win rate
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly Comparison */}
          <Card className="p-6">
            <h3 className="mb-4">Performance Insights</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm">Best Performing Month</h4>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-2xl">October 2024</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    74% win rate • $4.2M revenue
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm">Top Industry</h4>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-2xl">Infrastructure</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    35 tenders • $22.5M value
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm">Average Response Time</h4>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-2xl">8.3 days</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    15% faster than Q3
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
