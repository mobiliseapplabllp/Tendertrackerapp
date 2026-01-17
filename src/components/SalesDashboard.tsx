import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { pipelineApi, dealApi } from '../lib/api';
import { Loader2, TrendingUp, DollarSign, Target, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function SalesDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, forecastRes] = await Promise.all([
        pipelineApi.getAnalytics(),
        dealApi.getForecast('month'),
      ]);

      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
      if (forecastRes.success) {
        setForecast(forecastRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg text-red-600">{error}</p>
        <Button onClick={fetchData} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sales Dashboard</h1>
        <p className="text-muted-foreground">Analytics and forecasting for your sales pipeline</p>
      </div>

      {analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Tenders</p>
                  <p className="text-2xl font-bold mt-1">{analytics.metrics.totalLeads}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-indigo-600" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold mt-1">
                    {analytics.metrics.totalValue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Weighted Value</p>
                  <p className="text-2xl font-bold mt-1">
                    {analytics.metrics.weightedValue.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold mt-1">
                    {analytics.metrics.winRate.toFixed(1)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-emerald-600" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sales Funnel Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Sales Funnel</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.byStage}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="stage_name" type="category" width={100} />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        const val = typeof value === 'number' ? value : 0;
                        if (name === 'total_value') return [`$${val.toLocaleString()}`, 'Value'];
                        return [val, 'Count'];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="lead_count" fill="#6366f1" name="Leads Count" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Activity Breakdown Chart */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Activity Breakdown</h2>
              <div className="h-[300px] w-full">
                {analytics.activities && analytics.activities.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.activities}
                        cx="50%"
                        cy="50%"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="activity_type"
                      >
                        {analytics.activities.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No activity data available
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {forecast && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Forecast ({forecast.period})</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Deals</p>
              <p className="text-xl font-bold">{forecast.metrics.totalDeals}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Forecast Value</p>
              <p className="text-xl font-bold">{forecast.metrics.weightedValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Won Value</p>
              <p className="text-xl font-bold text-green-600">{forecast.metrics.wonValue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

