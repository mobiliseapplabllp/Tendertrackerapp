import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { salesApi } from '../lib/api';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Target, Users, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

interface PerformanceOverviewProps {
  onNavigateToProductLine?: (productLineId: number) => void;
  onNavigateToTeam?: (productLineId: number) => void;
  onNavigateToIndividual?: (userId: number) => void;
}

export function SalesPerformanceOverview({ onNavigateToProductLine, onNavigateToTeam, onNavigateToIndividual }: PerformanceOverviewProps) {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [periodType, setPeriodType] = useState('quarterly');
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [periodQuarter, setPeriodQuarter] = useState(currentQuarter);
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [pipelineAnalysis, setPipelineAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [periodType, periodYear, periodQuarter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { period_type: periodType, period_year: periodYear };
      if (periodType === 'quarterly') params.period_quarter = periodQuarter;

      const [overviewRes, trendsRes, leaderboardRes, pipelineRes] = await Promise.all([
        salesApi.getOverview(params),
        salesApi.getTrends({ months: 12 }),
        salesApi.getLeaderboard(params),
        salesApi.getPipelineAnalysis(),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (trendsRes.success) setTrends(trendsRes.data);
      if (leaderboardRes.success) setLeaderboard(leaderboardRes.data);
      if (pipelineRes.success) setPipelineAnalysis(pipelineRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString()}`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-muted-foreground">Loading sales performance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  const totalTarget = overview?.companyTotal?.totalTarget || 0;
  const totalAchieved = overview?.companyTotal?.totalAchieved || 0;
  const achievementPct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;
  const totalWonDeals = overview?.companyTotal?.wonDeals || 0;
  const totalActiveDeals = overview?.companyTotal?.activeDeals || 0;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-[130px] flex-shrink-0">
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-[100px] flex-shrink-0">
          <Select value={String(periodYear)} onValueChange={(v) => setPeriodYear(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {periodType === 'quarterly' && (
          <div className="w-[80px] flex-shrink-0">
            <Select value={String(periodQuarter)} onValueChange={(v) => setPeriodQuarter(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(q => (
                  <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={fetchData}>
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Target</p>
            <Target className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalTarget)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {periodType === 'quarterly' ? `Q${periodQuarter}` : 'Full Year'} {periodYear}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Achieved</p>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalAchieved)}</p>
          <div className="flex items-center mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
              <div
                className={`h-2 rounded-full ${getProgressColor(achievementPct)}`}
                style={{ width: `${Math.min(achievementPct, 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium">{achievementPct.toFixed(1)}%</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Won Deals</p>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">{totalWonDeals}</p>
          <p className="text-xs text-muted-foreground mt-1">Closed successfully</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Active Pipeline</p>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{totalActiveDeals}</p>
          <p className="text-xs text-muted-foreground mt-1">In progress</p>
        </Card>
      </div>

      {/* Product Line Performance */}
      {overview?.productLines && overview.productLines.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Product Line Performance</h3>
          <div className="space-y-4">
            {overview.productLines.map((pl: any) => {
              const pct = pl.target > 0 ? (pl.achieved / pl.target) * 100 : 0;
              return (
                <div
                  key={pl.productLineId}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => onNavigateToProductLine?.(pl.productLineId)}
                >
                  <div className="w-32 font-medium text-sm truncate">{pl.productLineName}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{formatCurrency(pl.achieved)} / {formatCurrency(pl.target)}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${getProgressColor(pct)}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    {/* Sub-category split */}
                    {(pl.softwareAchieved > 0 || pl.hardwareAchieved > 0) && (
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>SW: {formatCurrency(pl.softwareAchieved || 0)}</span>
                        <span>HW: {formatCurrency(pl.hardwareAchieved || 0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={pct >= 100 ? 'default' : pct >= 75 ? 'secondary' : 'destructive'}>
                      {pl.wonDeals} won
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        {trends?.monthlyTrends && trends.monthlyTrends.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Trend (12 Months)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="wonValue" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Won" />
                  <Area type="monotone" dataKey="lostValue" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Lost" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        {leaderboard?.rankings && leaderboard.rankings.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
            <div className="space-y-3">
              {leaderboard.rankings.slice(0, 10).map((user: any, idx: number) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => onNavigateToIndividual?.(user.userId)}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-700' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.productLineName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(user.achieved)}</p>
                    <p className="text-xs text-muted-foreground">{user.achievementPct?.toFixed(0)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Pipeline Analysis */}
      {pipelineAnalysis?.stageBreakdown && pipelineAnalysis.stageBreakdown.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Pipeline Analysis</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineAnalysis.stageBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                <YAxis dataKey="stageName" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="totalValue" fill="#6366f1" name="Total Value" radius={[0, 4, 4, 0]} />
                <Bar dataKey="weightedValue" fill="#22c55e" name="Weighted Value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
