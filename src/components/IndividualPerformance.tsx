import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { salesApi, productLineApi } from '../lib/api';
import {
  Loader2, TrendingUp, TrendingDown, DollarSign, Target, Award, User,
  ArrowLeft, BarChart3, Calendar, Briefcase, ChevronUp, ChevronDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, LineChart, Line
} from 'recharts';

interface IndividualPerformanceProps {
  userId?: number;
  onBack?: () => void;
  currentUser?: any;
}

export function IndividualPerformance({ userId, onBack, currentUser }: IndividualPerformanceProps) {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  // Use prop userId or fall back to current user
  const targetUserId = userId || currentUser?.id;

  const [periodType, setPeriodType] = useState('quarterly');
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [periodQuarter, setPeriodQuarter] = useState(currentQuarter);
  const [performance, setPerformance] = useState<any>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targetUserId) fetchData();
  }, [targetUserId, periodType, periodYear, periodQuarter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const perfParams: any = { period_type: periodType, period_year: periodYear };
      if (periodType === 'quarterly') perfParams.period_quarter = periodQuarter;

      // Targets endpoint uses different param names
      const targetParams: any = { userId: targetUserId, periodType, year: periodYear };
      if (periodType === 'quarterly') targetParams.quarter = periodQuarter;

      const [perfRes, targetsRes, plRes] = await Promise.all([
        salesApi.getIndividualPerformance(targetUserId, perfParams),
        salesApi.getTargets(targetParams),
        productLineApi.getAll(),
      ]);

      if (perfRes.success) setPerformance(perfRes.data);
      if (targetsRes.success) setTargets(targetsRes.data?.targets || targetsRes.data || []);
      if (plRes.success) setProductLines(plRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (!value) return '₹0';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString()}`;
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'bg-green-500';
    if (pct >= 75) return 'bg-blue-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return 'text-green-600';
    if (pct >= 75) return 'text-blue-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-muted-foreground">Loading performance data...</span>
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

  const userName = performance?.userName || currentUser?.fullName || 'User';
  const userRole = performance?.userRole || '';
  const totalTarget = performance?.totalTarget || 0;
  const totalAchieved = performance?.totalAchieved || 0;
  const achievementPct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;
  const wonDeals = performance?.wonDeals || 0;
  const lostDeals = performance?.lostDeals || 0;
  const activeDeals = performance?.activeDeals || 0;
  const winRate = performance?.winRate || 0;
  const avgDealSize = performance?.avgDealSize || 0;
  const avgCycleTime = performance?.avgCycleTime || 0;

  // Build radar chart data from product line performance
  const radarData = (performance?.productLineBreakdown || []).map((pl: any) => ({
    productLine: pl.productLineName,
    achievement: pl.targetValue > 0 ? Math.round((pl.achievedValue / pl.targetValue) * 100) : 0,
    deals: pl.wonDeals || 0,
  }));

  // Build monthly trend data
  const monthlyData = performance?.monthlyTrend || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{userName}</h2>
                {userRole && <p className="text-sm text-muted-foreground">{userRole}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(periodYear)} onValueChange={(v) => setPeriodYear(Number(v))}>
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {periodType === 'quarterly' && (
            <Select value={String(periodQuarter)} onValueChange={(v) => setPeriodQuarter(Number(v))}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(q => (
                  <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Target</p>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-lg font-bold">{formatCurrency(totalTarget)}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Achieved</p>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-lg font-bold">{formatCurrency(totalAchieved)}</p>
          <div className="flex items-center mt-1">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5 mr-2">
              <div className={`h-1.5 rounded-full ${getProgressColor(achievementPct)}`} style={{ width: `${Math.min(achievementPct, 100)}%` }} />
            </div>
            <span className={`text-xs font-semibold ${getStatusColor(achievementPct)}`}>{achievementPct.toFixed(0)}%</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Won Deals</p>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-green-600">{wonDeals}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold">{winRate.toFixed(1)}%</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Avg Deal Size</p>
            <BarChart3 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold">{formatCurrency(avgDealSize)}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">Avg Cycle</p>
            <Calendar className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-lg font-bold">{avgCycleTime} days</p>
        </Card>
      </div>

      {/* Deal Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-green-500">
          <p className="text-sm text-muted-foreground">Won</p>
          <p className="text-2xl font-bold text-green-600">{wonDeals}</p>
          <p className="text-xs text-muted-foreground">deals closed</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-sm text-muted-foreground">Lost</p>
          <p className="text-2xl font-bold text-red-600">{lostDeals}</p>
          <p className="text-xs text-muted-foreground">deals lost</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-blue-600">{activeDeals}</p>
          <p className="text-xs text-muted-foreground">in pipeline</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Line Breakdown */}
        {radarData.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Product Line Achievement</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="productLine" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Achievement %" dataKey="achievement" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Tooltip formatter={(value: any) => `${value}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Monthly Trend */}
        {monthlyData.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="wonValue" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Won Value" />
                  <Line type="monotone" dataKey="pipelineValue" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Pipeline Value" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* Targets Table with Sub-Category Split */}
      {targets.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Target Breakdown</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Line</TableHead>
                <TableHead>Sub-Category</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Achieved</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((t: any) => {
                const pct = t.target_value > 0 ? (t.achieved_value / t.target_value) * 100 : 0;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.product_line_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        t.sub_category === 'Software' ? 'border-blue-300 text-blue-700' :
                        t.sub_category === 'Hardware' ? 'border-orange-300 text-orange-700' :
                        'border-gray-300 text-gray-700'
                      }>
                        {t.sub_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.period_type === 'quarterly' ? `Q${t.period_quarter} ` : ''}{t.period_year}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(t.target_value)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatCurrency(t.achieved_value)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${getProgressColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        t.status === 'Active' ? 'bg-green-100 text-green-700' :
                        t.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Product Line Detail Cards */}
      {performance?.productLineBreakdown && performance.productLineBreakdown.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Product Line Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {performance.productLineBreakdown.map((pl: any) => {
              const plPct = pl.targetValue > 0 ? (pl.achievedValue / pl.targetValue) * 100 : 0;
              return (
                <Card key={pl.productLineId} className="p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-500" />
                      <h4 className="font-semibold">{pl.productLineName}</h4>
                    </div>
                    <Badge variant={plPct >= 100 ? 'default' : plPct >= 75 ? 'secondary' : 'destructive'}>
                      {plPct.toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="bg-gray-200 rounded-full h-2 mb-3">
                    <div className={`h-2 rounded-full ${getProgressColor(plPct)}`} style={{ width: `${Math.min(plPct, 100)}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Target</p>
                      <p className="font-semibold">{formatCurrency(pl.targetValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Achieved</p>
                      <p className="font-semibold text-green-600">{formatCurrency(pl.achievedValue)}</p>
                    </div>
                    {(pl.softwareValue > 0 || pl.hardwareValue > 0) && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Software</p>
                          <p className="font-medium text-blue-600">{formatCurrency(pl.softwareValue || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hardware</p>
                          <p className="font-medium text-orange-600">{formatCurrency(pl.hardwareValue || 0)}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-muted-foreground">Won Deals</p>
                      <p className="font-semibold">{pl.wonDeals || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Active Deals</p>
                      <p className="font-semibold">{pl.activeDeals || 0}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
