import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
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
import { reportApi } from '../lib/api';

export function ReportsAnalytics() {
  const { formatCurrency, formatDate } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [tenderReports, setTenderReports] = useState<any>(null);

  useEffect(() => {
    fetchReports();
  }, [selectedYear]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate year
      const year = parseInt(selectedYear);
      if (isNaN(year) || year < 2020 || year > 2030) {
        setError('Invalid year selected');
        setLoading(false);
        return;
      }
      
      // Fetch performance metrics
      const perfResponse = await reportApi.getPerformance({ year: selectedYear });
      if (perfResponse.success && perfResponse.data) {
        // Validate and set performance data
        const data = perfResponse.data;
        setPerformanceData({
          quarterlyPerformance: Array.isArray(data.quarterlyPerformance) ? data.quarterlyPerformance : [],
          winRateTrend: Array.isArray(data.winRateTrend) ? data.winRateTrend : [],
          totalRevenue: typeof data.totalRevenue === 'number' ? data.totalRevenue : 0,
          avgWinRate: typeof data.avgWinRate === 'number' ? data.avgWinRate : 0,
          avgDealSize: typeof data.avgDealSize === 'number' ? data.avgDealSize : 0,
        });
      } else {
        setError(perfResponse.error || 'Failed to load performance data');
      }

      // Fetch tender reports
      const tenderResponse = await reportApi.getTenderReports({ year: selectedYear });
      if (tenderResponse.success && tenderResponse.data) {
        // Validate and set tender reports data
        const data = tenderResponse.data;
        setTenderReports({
          totalTenders: typeof data.totalTenders === 'number' ? data.totalTenders : 0,
          industryBreakdown: Array.isArray(data.industryBreakdown) ? data.industryBreakdown : [],
          topClients: Array.isArray(data.topClients) ? data.topClients : [],
        });
      } else {
        setError(tenderResponse.error || 'Failed to load tender reports');
      }
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // formatCurrency is now provided by useSettings hook

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Reports & Analytics
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  // Use real data from API or show empty state
  const quarterlyData = performanceData?.quarterlyPerformance || [];
  const industryData = tenderReports?.industryBreakdown || [];
  const winRateData = performanceData?.winRateTrend || [];
  const topClientsData = tenderReports?.topClients || [];

  const totalRevenue = performanceData?.totalRevenue || 0;
  const totalEMD = performanceData?.totalEMD || 0;
  const totalFees = performanceData?.totalFees || 0;
  const totalTenders = tenderReports?.totalTenders || 0;
  const winRate = performanceData?.avgWinRate || 0;
  const avgDealSize = performanceData?.avgDealSize || 0;

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
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={async () => {
                try {
                  setError(null);
                  const response = await reportApi.exportData('csv', { year: selectedYear });
                  if (response.success && response.data) {
                    // Create blob and download
                    const blob = new Blob([response.data], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tender-reports-${selectedYear}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } else {
                    setError(response.error || 'Failed to export report');
                  }
                } catch (err: any) {
                  setError(err.message || 'Failed to export report');
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-800 text-sm">{error}</p>
            </Card>
          )}

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-3xl">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground mt-1">Year {selectedYear}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total EMD</p>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-3xl">{formatCurrency(totalEMD)}</p>
              <p className="text-sm text-muted-foreground mt-1">Year {selectedYear}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Tender Fees</p>
                <DollarSign className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-3xl">{formatCurrency(totalFees)}</p>
              <p className="text-sm text-muted-foreground mt-1">Year {selectedYear}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Tenders</p>
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-3xl">{totalTenders}</p>
              <p className="text-sm text-muted-foreground mt-1">Year {selectedYear}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-3xl">{winRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Average</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                <DollarSign className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-3xl">{formatCurrency(avgDealSize)}</p>
              <p className="text-sm text-muted-foreground mt-1">Per tender</p>
            </Card>
          </div>

          {/* Quarterly Performance */}
          {quarterlyData.length > 0 ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3>Quarterly Performance</h3>
                <Badge className="bg-blue-100 text-blue-800">Year {selectedYear}</Badge>
              </div>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={350} minWidth={600}>
                <AreaChart data={quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'Revenue (₹Cr)') {
                        return formatCurrency(value);
                      }
                      return value;
                    }}
                  />
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
                    name="Revenue (₹Cr)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No quarterly performance data available</p>
              </div>
            </Card>
          )}

          {/* Industry Breakdown & Win Rate Trend */}
          <div className="grid grid-cols-2 gap-6">
            {industryData.length > 0 ? (
              <Card className="p-6">
                <h3 className="mb-4">Industry Breakdown</h3>
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={300} minWidth={500}>
                  <BarChart data={industryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="industry" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'Value (₹Cr)') {
                          return formatCurrency(value);
                        }
                        return value;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Tender Count" />
                    <Bar 
                      dataKey="value" 
                      fill="#10b981" 
                      name="Value (₹Cr)"
                    />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No industry data available</p>
                </div>
              </Card>
            )}

            {winRateData.length > 0 ? (
              <Card className="p-6">
                <h3 className="mb-4">Win Rate Trend</h3>
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={300} minWidth={500}>
                  <LineChart data={winRateData}>
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
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No win rate data available</p>
                </div>
              </Card>
            )}
          </div>

          {/* Top Clients Performance */}
          {topClientsData.length > 0 ? (
            <Card className="p-6">
              <h3 className="mb-4">Top Clients by Performance</h3>
              <div className="space-y-3">
                {topClientsData.map((client: any, index: number) => (
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
                      <p className="text-lg">{formatCurrency(client.value)}</p>
                      <Badge className="bg-green-100 text-green-800">
                        {Math.round((client.won / client.tenders) * 100)}% win rate
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No client performance data available</p>
              </div>
            </Card>
          )}

          {/* Empty State if no data */}
          {totalTenders === 0 && totalRevenue === 0 && (
            <Card className="p-6">
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No Reports Data Available</p>
                <p className="text-sm">
                  Start creating tenders to see analytics and reports
                </p>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
