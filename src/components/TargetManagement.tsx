import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { salesApi, productLineApi, userApi } from '../lib/api';
import {
  Loader2, Target, Plus, Copy, Edit2, Check, X, TrendingUp,
  BarChart3, Share2
} from 'lucide-react';

export function TargetManagement() {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const [targets, setTargets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [periodType, setPeriodType] = useState('quarterly');
  const [periodYear, setPeriodYear] = useState(currentYear);
  const [periodQuarter, setPeriodQuarter] = useState(currentQuarter);
  const [filterProductLine, setFilterProductLine] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dialog states
  const [showCreate, setShowCreate] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [editingTarget, setEditingTarget] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDeals, setEditDeals] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    product_line_id: '',
    sub_category: 'All',
    period_type: 'quarterly',
    period_year: currentYear,
    period_quarter: currentQuarter,
    target_value: '',
    target_deals: '',
  });
  const [salesHeadInfo, setSalesHeadInfo] = useState<string>('');

  // Distribute dialog
  const [showDistribute, setShowDistribute] = useState(false);
  const [distributeTarget, setDistributeTarget] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<Array<{ userId: number; name: string; targetValue: string }>>([]);

  // Copy form
  const [copyForm, setCopyForm] = useState({
    from_period_type: 'quarterly',
    from_period_year: currentYear,
    from_period_quarter: currentQuarter > 1 ? currentQuarter - 1 : 4,
    to_period_type: 'quarterly',
    to_period_year: currentYear,
    to_period_quarter: currentQuarter,
    adjustment_percent: '0',
  });

  useEffect(() => {
    fetchData();
  }, [periodType, periodYear, periodQuarter, filterProductLine, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        periodType: periodType,
        year: periodYear,
      };
      if (periodType === 'quarterly') params.quarter = periodQuarter;
      if (filterProductLine !== 'all') params.productLineId = filterProductLine;
      if (filterStatus !== 'all') params.status = filterStatus;

      const summaryParams: any = { year: periodYear };
      if (periodType === 'quarterly') summaryParams.quarter = periodQuarter;

      const [targetsRes, summaryRes, plRes, usersRes] = await Promise.all([
        salesApi.getTargets(params),
        salesApi.getTargetSummary(summaryParams),
        productLineApi.getAll(),
        userApi.getAll({ pageSize: 500 } as any),
      ]);

      if (targetsRes.success) setTargets(targetsRes.data?.targets || targetsRes.data || []);
      if (summaryRes.success) {
        // Compute aggregated summary from rows
        const rows = Array.isArray(summaryRes.data) ? summaryRes.data : [];
        const totalTarget = rows.reduce((sum: number, r: any) => sum + Number(r.total_target || 0), 0);
        const totalAchieved = rows.reduce((sum: number, r: any) => sum + Number(r.total_achieved || 0), 0);
        setSummary({ totalTarget, totalAchieved, rows });
      }
      if (plRes.success) setProductLines(plRes.data || []);
      if (usersRes.success) {
        const userList = usersRes.data?.data || usersRes.data?.users || usersRes.data || [];
        setUsers(Array.isArray(userList) ? userList : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load targets');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString()}`;
  };

  // Lookup Sales Head when product line changes in create form
  const handleProductLineChange = async (plId: string) => {
    setCreateForm(f => ({ ...f, product_line_id: plId }));
    setSalesHeadInfo('');
    if (!plId) return;
    try {
      const res = await salesApi.getTeamByProductLine(Number(plId));
      if (res.success && res.data?.salesHead) {
        setSalesHeadInfo(res.data.salesHead.fullName || res.data.salesHead.name || 'Assigned');
      } else {
        setSalesHeadInfo('No Sales Head assigned');
      }
    } catch {
      setSalesHeadInfo('Could not fetch Sales Head');
    }
  };

  const handleCreate = async () => {
    try {
      setActionLoading(true);
      const res = await salesApi.createTarget({
        productLineId: Number(createForm.product_line_id),
        subCategory: createForm.sub_category,
        periodType: createForm.period_type,
        periodYear: createForm.period_year,
        periodQuarter: createForm.period_quarter,
        targetValue: Number(createForm.target_value),
        targetDeals: createForm.target_deals ? Number(createForm.target_deals) : undefined,
      });
      if (!res.success) {
        alert(res.error || 'Failed to create target');
        return;
      }
      setShowCreate(false);
      setCreateForm({
        product_line_id: '', sub_category: 'All',
        period_type: 'quarterly', period_year: currentYear,
        period_quarter: currentQuarter, target_value: '', target_deals: '',
      });
      setSalesHeadInfo('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create target');
    } finally {
      setActionLoading(false);
    }
  };

  // Open distribute dialog for a target
  const handleOpenDistribute = async (target: any) => {
    setDistributeTarget(target);
    try {
      const res = await salesApi.getTeamByProductLine(target.product_line_id);
      if (res.success && res.data?.members) {
        const members = res.data.members;
        setTeamMembers(members);
        setDistributions(members.map((m: any) => ({
          userId: m.id,
          name: m.fullName || m.name || m.email,
          targetValue: '',
        })));
      } else {
        setTeamMembers([]);
        setDistributions([]);
      }
    } catch {
      setTeamMembers([]);
      setDistributions([]);
    }
    setShowDistribute(true);
  };

  const handleDistribute = async () => {
    if (!distributeTarget) return;
    const validDist = distributions.filter(d => d.targetValue && Number(d.targetValue) > 0);
    if (validDist.length === 0) {
      alert('Please enter target values for at least one team member');
      return;
    }
    try {
      setActionLoading(true);
      await salesApi.distributeTarget(distributeTarget.id, {
        distributions: validDist.map(d => ({
          userId: d.userId,
          targetValue: Number(d.targetValue),
        })),
      });
      setShowDistribute(false);
      setDistributeTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to distribute target');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      setActionLoading(true);
      await salesApi.updateTarget(id, {
        targetValue: Number(editValue),
        targetDeals: editDeals ? Number(editDeals) : undefined,
      });
      setEditingTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update target');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await salesApi.updateTarget(id, { status: 'Active' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to activate target');
    }
  };

  const handleCopyPeriod = async () => {
    try {
      setActionLoading(true);
      await salesApi.copyPeriodTargets({
        fromYear: copyForm.from_period_year,
        fromQuarter: copyForm.from_period_type === 'quarterly' ? copyForm.from_period_quarter : undefined,
        toYear: copyForm.to_period_year,
        toQuarter: copyForm.to_period_type === 'quarterly' ? copyForm.to_period_quarter : undefined,
        productLineId: filterProductLine !== 'all' ? Number(filterProductLine) : undefined,
      });
      setShowCopy(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to copy targets');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-emerald-500 text-white">Active</Badge>;
      case 'Draft': return <Badge variant="secondary">Draft</Badge>;
      case 'Closed': return <Badge variant="outline">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'bg-green-500';
    if (pct >= 75) return 'bg-blue-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading && targets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-muted-foreground">Loading targets...</span>
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

  // Group targets by product line, then user
  const groupedByProductLine: Record<string, any[]> = {};
  targets.forEach(t => {
    const key = t.product_line_name || t.productLineName || `PL-${t.product_line_id}`;
    if (!groupedByProductLine[key]) groupedByProductLine[key] = [];
    groupedByProductLine[key].push(t);
  });

  return (
    <div className="space-y-6">
      {/* Period + Filter Controls */}
      <div className="flex flex-wrap items-end gap-3">
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

        <div className="w-[180px] flex-shrink-0">
          <Select value={filterProductLine} onValueChange={setFilterProductLine}>
            <SelectTrigger>
              <SelectValue placeholder="Product Line" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Product Lines</SelectItem>
              {productLines.filter(pl => pl.isActive !== false).map(pl => (
                <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[130px] flex-shrink-0">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex gap-2">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Target
          </Button>
          <Button variant="outline" onClick={() => setShowCopy(true)}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Period
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Target</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalTarget || 0)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Achieved</p>
            <p className="text-xl font-bold mt-1 text-green-600">{formatCurrency(summary.totalAchieved || 0)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Achievement %</p>
            <p className="text-xl font-bold mt-1">
              {summary.totalTarget > 0 ? ((summary.totalAchieved / summary.totalTarget) * 100).toFixed(1) : 0}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Active Targets</p>
            <p className="text-xl font-bold mt-1">{targets.filter(t => t.status === 'Active').length}</p>
          </Card>
        </div>
      )}

      {/* Targets Table grouped by Product Line */}
      {Object.keys(groupedByProductLine).length > 0 ? (
        Object.entries(groupedByProductLine).map(([plName, plTargets]) => (
          <Card key={plName} className="overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold">{plName}</h3>
              <Badge variant="outline" className="ml-2">{plTargets.length} targets</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Sub-Category</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Achieved</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plTargets.map((t: any) => {
                  const pct = t.target_value > 0 ? (t.achieved_value / t.target_value) * 100 : 0;
                  const isEditing = editingTarget === t.id;

                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.user_name || t.userName}</TableCell>
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
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-28 text-right"
                          />
                        ) : (
                          formatCurrency(t.target_value)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(t.achieved_value)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(pct)}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleUpdate(t.id)} disabled={actionLoading}>
                              <Check className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTarget(null)}>
                              <X className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingTarget(t.id);
                                setEditValue(String(t.target_value));
                                setEditDeals(String(t.target_deals || ''));
                              }}
                              title="Edit target"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDistribute(t)}
                              title="Distribute to team"
                            >
                              <Share2 className="w-3 h-3 text-indigo-600" />
                            </Button>
                            {t.status === 'Draft' && (
                              <Button size="sm" variant="ghost" onClick={() => handleActivate(t.id)}>
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ))
      ) : (
        <Card className="p-12 text-center">
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">No Targets Found</h3>
          <p className="text-muted-foreground mb-4">
            No targets set for the selected period. Create new targets or copy from a previous period.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Target
            </Button>
            <Button variant="outline" onClick={() => setShowCopy(true)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy from Previous
            </Button>
          </div>
        </Card>
      )}

      {/* Create Target Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sales Target</DialogTitle>
            <DialogDescription>Set a target for a product line. It will be assigned to the Sales Head.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product Line</Label>
                <Select value={createForm.product_line_id} onValueChange={handleProductLineChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {productLines.filter(pl => pl.isActive !== false).map(pl => (
                      <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sub-Category</Label>
                <Select value={createForm.sub_category} onValueChange={(v) => setCreateForm(f => ({ ...f, sub_category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All (Combined)</SelectItem>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {salesHeadInfo && (
              <div className="text-sm px-3 py-2 rounded bg-gray-50 border">
                <span className="text-muted-foreground">Sales Head: </span>
                <span className={salesHeadInfo.includes('No') ? 'text-red-600 font-medium' : 'font-medium'}>{salesHeadInfo}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Period Type</Label>
                <Select value={createForm.period_type} onValueChange={(v) => setCreateForm(f => ({ ...f, period_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select value={String(createForm.period_year)} onValueChange={(v) => setCreateForm(f => ({ ...f, period_year: Number(v) }))}>
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
              {createForm.period_type === 'quarterly' && (
                <div>
                  <Label>Quarter</Label>
                  <Select value={String(createForm.period_quarter)} onValueChange={(v) => setCreateForm(f => ({ ...f, period_quarter: Number(v) }))}>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Target Value (₹)</Label>
                <Input
                  type="number"
                  value={createForm.target_value}
                  onChange={(e) => setCreateForm(f => ({ ...f, target_value: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Target Deals (optional)</Label>
                <Input
                  type="number"
                  value={createForm.target_deals}
                  onChange={(e) => setCreateForm(f => ({ ...f, target_deals: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={actionLoading || !createForm.product_line_id || !createForm.target_value || salesHeadInfo.includes('No')}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Distribute Target Dialog */}
      <Dialog open={showDistribute} onOpenChange={setShowDistribute}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Distribute Target to Team</DialogTitle>
            <DialogDescription>
              {distributeTarget && (
                <>Split the target of ₹{Number(distributeTarget.target_value).toLocaleString()} among team members.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {distributions.length > 0 ? distributions.map((dist, idx) => (
              <div key={dist.userId} className="flex items-center gap-3">
                <span className="text-sm font-medium w-[140px] truncate">{dist.name}</span>
                <Input
                  type="number"
                  placeholder="Target value"
                  value={dist.targetValue}
                  onChange={(e) => {
                    const updated = [...distributions];
                    updated[idx] = { ...updated[idx], targetValue: e.target.value };
                    setDistributions(updated);
                  }}
                  className="flex-1"
                />
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members assigned to this product line. Add members in Team Structure first.
              </p>
            )}
            {distributions.length > 0 && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <span className="text-sm font-medium w-[140px]">Total Distributed</span>
                <span className="text-sm font-bold">
                  ₹{distributions.reduce((s, d) => s + (Number(d.targetValue) || 0), 0).toLocaleString()}
                  {distributeTarget && (
                    <span className="text-muted-foreground font-normal"> / ₹{Number(distributeTarget.target_value).toLocaleString()}</span>
                  )}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistribute(false)}>Cancel</Button>
            <Button onClick={handleDistribute} disabled={actionLoading || distributions.every(d => !d.targetValue)}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Distribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Period Dialog */}
      <Dialog open={showCopy} onOpenChange={setShowCopy}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Targets from Previous Period</DialogTitle>
            <DialogDescription>Clone targets from one period to another with optional adjustment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">From Period</p>
              <div className="grid grid-cols-3 gap-3">
                <Select value={copyForm.from_period_type} onValueChange={(v) => setCopyForm(f => ({ ...f, from_period_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(copyForm.from_period_year)} onValueChange={(v) => setCopyForm(f => ({ ...f, from_period_year: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {copyForm.from_period_type === 'quarterly' && (
                  <Select value={String(copyForm.from_period_quarter)} onValueChange={(v) => setCopyForm(f => ({ ...f, from_period_quarter: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map(q => (
                        <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="p-3 bg-indigo-50 rounded-lg">
              <p className="text-sm font-medium mb-2">To Period</p>
              <div className="grid grid-cols-3 gap-3">
                <Select value={copyForm.to_period_type} onValueChange={(v) => setCopyForm(f => ({ ...f, to_period_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={String(copyForm.to_period_year)} onValueChange={(v) => setCopyForm(f => ({ ...f, to_period_year: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {copyForm.to_period_type === 'quarterly' && (
                  <Select value={String(copyForm.to_period_quarter)} onValueChange={(v) => setCopyForm(f => ({ ...f, to_period_quarter: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map(q => (
                        <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div>
              <Label>Adjustment % (e.g., 10 for 10% increase, -5 for 5% decrease)</Label>
              <Input
                type="number"
                value={copyForm.adjustment_percent}
                onChange={(e) => setCopyForm(f => ({ ...f, adjustment_percent: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopy(false)}>Cancel</Button>
            <Button onClick={handleCopyPeriod} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Copy Targets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
