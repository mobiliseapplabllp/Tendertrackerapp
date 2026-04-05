import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { salesApi, productLineApi, userApi } from '../lib/api';
import {
  Loader2, Users, Crown, UserPlus, ArrowRightLeft, Trash2, History,
  ChevronDown, ChevronRight, Building2, Shield
} from 'lucide-react';

interface TeamMember {
  id: number;
  userId: number;
  userName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface TeamStructure {
  productLineId: number;
  productLineName: string;
  salesHead: { userId: number; userName: string; email: string } | null;
  members: TeamMember[];
}

export function TeamStructureManager() {
  const [teams, setTeams] = useState<TeamStructure[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Dialog states
  const [showAssignHead, setShowAssignHead] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedProductLine, setSelectedProductLine] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedHead, setSelectedHead] = useState<string>('');
  const [transferTarget, setTransferTarget] = useState<string>('');
  const [transferAssignmentId, setTransferAssignmentId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [teamRes, plRes, usersRes] = await Promise.all([
        salesApi.getTeamStructure(),
        productLineApi.getAll(),
        userApi.getAll({ pageSize: 500 } as any),
      ]);

      if (teamRes.success) {
        // Map backend data structure to frontend interface
        const rawTeams = teamRes.data?.teams || teamRes.data || [];
        const mappedTeams = (Array.isArray(rawTeams) ? rawTeams : []).map((t: any) => ({
          productLineId: t.productLineId || t.id,
          productLineName: t.productLineName || t.name,
          salesHead: t.salesHead ? {
            userId: t.salesHead.userId || t.salesHead.id,
            userName: t.salesHead.userName || t.salesHead.fullName || t.salesHead.name,
            email: t.salesHead.email,
          } : null,
          members: (t.members || []).map((m: any) => ({
            id: m.id,
            userId: m.userId || m.id,
            userName: m.userName || m.fullName || m.name,
            email: m.email,
            role: m.role || 'Member',
            isActive: m.isActive !== false,
          })),
        }));
        setTeams(mappedTeams);
      }
      if (plRes.success) setProductLines(plRes.data || []);
      if (usersRes.success) {
        const userList = usersRes.data?.data || usersRes.data?.users || usersRes.data || [];
        setUsers(Array.isArray(userList) ? userList : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load team structure');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await salesApi.getTeamHistory({ limit: 50 });
      if (res.success) setHistory(res.data?.history || []);
      setShowHistory(true);
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleAssignHead = async () => {
    if (!selectedProductLine || !selectedUser) return;
    try {
      setActionLoading(true);
      const res = await salesApi.assignHead({ userId: Number(selectedUser), productLineId: selectedProductLine });
      if (!res.success) {
        alert(res.error || 'Failed to assign sales head');
        return;
      }
      setShowAssignHead(false);
      setSelectedUser('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign sales head');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedProductLine || !selectedUser || !selectedHead) return;
    try {
      setActionLoading(true);
      const res = await salesApi.addMember({
        userId: Number(selectedUser),
        productLineId: selectedProductLine,
      });
      if (!res.success) {
        alert(res.error || 'Failed to add team member');
        return;
      }
      setShowAddMember(false);
      setSelectedUser('');
      setSelectedHead('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add team member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    try {
      await salesApi.removeMember(assignmentId);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleTransfer = async () => {
    if (!transferAssignmentId || !transferTarget) return;
    try {
      setActionLoading(true);
      // Find the member being transferred and their current product line
      let transferUserId: number | null = null;
      let fromPLId: number | null = null;
      for (const team of teams) {
        const member = team.members?.find((m: any) => m.id === transferAssignmentId);
        if (member) {
          transferUserId = member.userId || member.id;
          fromPLId = team.productLineId;
          break;
        }
      }
      if (!transferUserId || !fromPLId) {
        alert('Could not find the member to transfer.');
        return;
      }
      await salesApi.transferMember({
        userId: transferUserId,
        fromProductLineId: fromPLId,
        toProductLineId: Number(transferTarget),
      });
      setShowTransfer(false);
      setTransferTarget('');
      setTransferAssignmentId(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to transfer member');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-muted-foreground">Loading team structure...</span>
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

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => { setShowAssignHead(true); setSelectedProductLine(productLines[0]?.id || null); }}>
          <Crown className="w-4 h-4 mr-2" />
          Assign Sales Head
        </Button>
        <Button variant="outline" onClick={() => { setShowAddMember(true); setSelectedProductLine(productLines[0]?.id || null); }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
        <Button variant="outline" onClick={fetchHistory}>
          <History className="w-4 h-4 mr-2" />
          View History
        </Button>
      </div>

      {/* Team Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {productLines.filter(pl => pl.isActive !== false).map(pl => {
          const team = teams.find(t => t.productLineId === pl.id);
          const isExpanded = expandedTeam === pl.id;
          const memberCount = team?.members?.length || 0;

          return (
            <Card key={pl.id} className="overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setExpandedTeam(isExpanded ? null : pl.id)}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="font-semibold">{pl.name}</h3>
                    <p className="text-xs text-muted-foreground">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {team?.salesHead ? (
                    <Badge variant="default" className="bg-indigo-600 text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      {team.salesHead.userName}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">No Head</Badge>
                  )}
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-4 pb-4">
                  {/* Sales Head */}
                  <div className="py-3 border-b">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                      <Shield className="w-4 h-4" />
                      Sales Head
                    </div>
                    {team?.salesHead ? (
                      <div className="flex items-center justify-between pl-6">
                        <div>
                          <p className="font-medium">{team.salesHead.userName}</p>
                          <p className="text-xs text-muted-foreground">{team.salesHead.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductLine(pl.id);
                            setShowAssignHead(true);
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductLine(pl.id);
                          setShowAssignHead(true);
                        }}
                      >
                        Assign Head
                      </Button>
                    )}
                  </div>

                  {/* Team Members */}
                  <div className="py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Users className="w-4 h-4" />
                        Team Members ({memberCount})
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductLine(pl.id);
                          if (team?.salesHead) setSelectedHead(String(team.salesHead.userId));
                          setShowAddMember(true);
                        }}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {team?.members && team.members.length > 0 ? (
                      <div className="space-y-2 pl-6">
                        {team.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium">{member.userName}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Transfer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferAssignmentId(member.id);
                                  setShowTransfer(true);
                                }}
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Remove"
                                className="text-red-500 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMember(member.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-6">No team members assigned</p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Assign Sales Head Dialog */}
      <Dialog open={showAssignHead} onOpenChange={setShowAssignHead}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Sales Head</DialogTitle>
            <DialogDescription>Select a user to assign as sales head for a product line.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Product Line</Label>
              <Select value={String(selectedProductLine || '')} onValueChange={(v) => setSelectedProductLine(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product line" />
                </SelectTrigger>
                <SelectContent>
                  {productLines.filter(pl => pl.isActive !== false).map(pl => (
                    <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u: any) => u.status !== 'Inactive').map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignHead(false)}>Cancel</Button>
            <Button onClick={handleAssignHead} disabled={actionLoading || !selectedUser}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a user to a sales team under a sales head.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Product Line</Label>
              <Select value={String(selectedProductLine || '')} onValueChange={(v) => setSelectedProductLine(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product line" />
                </SelectTrigger>
                <SelectContent>
                  {productLines.filter(pl => pl.isActive !== false).map(pl => (
                    <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sales Head</Label>
              <Select value={selectedHead} onValueChange={setSelectedHead}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sales head" />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter(t => t.salesHead).map(t => (
                    <SelectItem key={t.salesHead!.userId} value={String(t.salesHead!.userId)}>
                      {t.salesHead!.userName} ({t.productLineName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>User to Add</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u: any) => u.status !== 'Inactive').map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={actionLoading || !selectedUser || !selectedHead}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Team Member</DialogTitle>
            <DialogDescription>Move a team member to a different product line.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Transfer to Product Line</Label>
              <Select value={transferTarget} onValueChange={setTransferTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target product line" />
                </SelectTrigger>
                <SelectContent>
                  {productLines.filter(pl => pl.isActive !== false).map(pl => (
                    <SelectItem key={pl.id} value={String(pl.id)}>{pl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfer(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={actionLoading || !transferTarget}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Team History</DialogTitle>
            <DialogDescription>Recent changes to team assignments.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Product Line</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length > 0 ? history.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={
                        h.action === 'assigned' ? 'default' :
                        h.action === 'removed' ? 'destructive' :
                        'secondary'
                      }>
                        {h.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{h.userName}</TableCell>
                    <TableCell className="text-sm">{h.productLineName}</TableCell>
                    <TableCell className="text-sm">{h.performedByName}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No history records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
