import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { salesApi, productLineApi, userApi } from '../lib/api';
import { useBranding } from '../hooks/useBranding';
import {
  Loader2, Crown, UserPlus, ArrowRightLeft, Trash2,
  Building2, Plus, X, AlertCircle
} from 'lucide-react';

interface TeamData {
  id: number;
  name: string;
  salesHead: { id: number; fullName: string; email: string } | null;
  members: { id: number; fullName: string; email: string; department?: string; assignmentId?: number }[];
}

export function TeamStructureManager() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { appName } = useBranding();

  // Dialog states
  const [showAssignHead, setShowAssignHead] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedProductLine, setSelectedProductLine] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedHead, setSelectedHead] = useState('');
  const [transferMemberId, setTransferMemberId] = useState<number | null>(null);
  const [transferFromPL, setTransferFromPL] = useState<number | null>(null);
  const [transferTarget, setTransferTarget] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamRes, usersRes] = await Promise.all([
        salesApi.getTeamStructure(),
        userApi.getAll({ pageSize: 500 } as any),
      ]);
      if (teamRes.success) setTeams(teamRes.data || []);
      if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignHead = async () => {
    if (!selectedProductLine || !selectedUser) return;
    setActionLoading(true);
    try {
      const res = await salesApi.assignHead({ userId: Number(selectedUser), productLineId: selectedProductLine });
      if (!res.success) { alert(res.error || 'Failed'); return; }
      setShowAssignHead(false); setSelectedUser(''); setSelectedProductLine(null);
      fetchData();
    } catch (err: any) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleAddMember = async () => {
    if (!selectedProductLine || !selectedUser || !selectedHead) return;
    setActionLoading(true);
    try {
      const res = await salesApi.addMember({
        teamMemberId: Number(selectedUser),
        salesHeadId: Number(selectedHead),
        productLineId: selectedProductLine,
      });
      if (!res.success) { alert(res.error || 'Failed'); return; }
      setShowAddMember(false); setSelectedUser(''); setSelectedHead(''); setSelectedProductLine(null);
      fetchData();
    } catch (err: any) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleRemoveMember = async (assignmentId: number) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await salesApi.removeMember(assignmentId);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleTransfer = async () => {
    if (!transferMemberId || !transferFromPL || !transferTarget) return;
    setActionLoading(true);
    try {
      const targetTeam = teams.find(t => t.id === Number(transferTarget));
      const toSalesHeadId = targetTeam?.salesHead?.id;
      if (!toSalesHeadId) { alert('Target product line has no sales head'); return; }
      await salesApi.transferMember({
        teamMemberId: transferMemberId,
        fromProductLineId: transferFromPL,
        toProductLineId: Number(transferTarget),
        toSalesHeadId,
      });
      setShowTransfer(false); setTransferTarget(''); setTransferMemberId(null); setTransferFromPL(null);
      fetchData();
    } catch (err: any) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const assignedUserIds = new Set(teams.flatMap(t => [t.salesHead?.id, ...t.members.map(m => m.id)].filter(Boolean)));
  const availableUsers = users.filter(u => !assignedUserIds.has(u.id) && u.status === 'Active');

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  if (error) return <div className="text-center py-20 text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" />{error}</div>;

  return (
    <div className="w-full overflow-x-auto pb-8">
      {/* CSS for org chart lines */}
      <style>{`
        .org-tree { display: flex; flex-direction: column; align-items: center; }
        .org-children { display: flex; gap: 24px; position: relative; padding-top: 24px; }
        .org-children::before { content: ''; position: absolute; top: 0; left: 50%; width: 0; height: 24px; border-left: 2px solid #c7d2fe; }
        .org-children > .org-node { position: relative; }
        .org-children > .org-node::before { content: ''; position: absolute; top: -24px; left: 50%; width: 0; height: 24px; border-left: 2px solid #c7d2fe; }
        .org-children:has(> .org-node:nth-child(2))::before { display: none; }
        .org-children:has(> .org-node:nth-child(2))::after { content: ''; position: absolute; top: 0; height: 0; border-top: 2px solid #c7d2fe; }
        .org-connector { position: relative; padding-top: 24px; }
        .org-connector::before { content: ''; position: absolute; top: 0; left: 50%; width: 0; height: 24px; border-left: 2px solid #c7d2fe; }
        .member-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; position: relative; padding-top: 20px; }
        .member-row::before { content: ''; position: absolute; top: 0; left: 50%; width: 0; height: 20px; border-left: 2px solid #e0e7ff; }
      `}</style>

      {/* Root Node */}
      <div className="org-tree">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-xl px-8 py-4 shadow-lg text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="font-bold text-lg">{appName}</p>
          <p className="text-indigo-200 text-xs">Organization Structure</p>
        </div>

        {/* Product Line Level */}
        <div className="org-connector">
          <div className="flex gap-8 justify-center" style={{ position: 'relative' }}>
            {/* Horizontal connector line */}
            {teams.length > 1 && (
              <div style={{
                position: 'absolute', top: 0,
                left: `calc(${100 / (teams.length * 2)}% + 12px)`,
                right: `calc(${100 / (teams.length * 2)}% + 12px)`,
                borderTop: '2px solid #c7d2fe'
              }} />
            )}

            {teams.map((team) => (
              <div key={team.id} className="flex flex-col items-center" style={{ position: 'relative', minWidth: 200 }}>
                {/* Vertical line from horizontal bar */}
                <div style={{ width: 0, height: 0, borderLeft: '2px solid #c7d2fe', position: 'absolute', top: -20, height: 20 }} />

                {/* Product Line Card */}
                <div className="bg-white border-2 border-indigo-200 rounded-xl px-5 py-3 shadow-sm text-center hover:shadow-md transition-shadow min-w-[180px]">
                  <Badge className="bg-indigo-100 text-indigo-700 mb-1 text-[10px]">Product Line</Badge>
                  <p className="font-semibold text-sm">{team.name}</p>
                  <p className="text-xs text-gray-400">{(team.members?.length || 0) + (team.salesHead ? 1 : 0)} people</p>
                </div>

                {/* Sales Head Level */}
                <div className="org-connector">
                  {team.salesHead ? (
                    <div className="bg-white border-2 border-amber-300 rounded-xl px-4 py-3 shadow-sm text-center min-w-[170px] relative group">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <span className="text-amber-700 font-bold text-sm">{getInitials(team.salesHead.fullName)}</span>
                      </div>
                      <Crown className="w-4 h-4 text-amber-500 absolute top-2 right-2" />
                      <p className="font-semibold text-sm">{team.salesHead.fullName}</p>
                      <p className="text-[10px] text-gray-500">{team.salesHead.email}</p>
                      <Badge className="bg-amber-100 text-amber-700 text-[9px] mt-1">Sales Head</Badge>
                      <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
                        <button onClick={() => { setSelectedProductLine(team.id); setShowAssignHead(true); }}
                          className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-blue-600"
                          title="Change Head">✏</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setSelectedProductLine(team.id); setShowAssignHead(true); }}
                      className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl px-4 py-4 text-center min-w-[170px] hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <UserPlus className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-500 font-medium">Assign Sales Head</p>
                    </button>
                  )}

                  {/* Team Members Level */}
                  {team.salesHead && (
                    <div className="member-row mt-0">
                      {team.members?.map((member) => (
                        <div key={member.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-center min-w-[140px] max-w-[160px] relative group hover:shadow-sm transition-shadow">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-1">
                            <span className="text-indigo-600 font-semibold text-xs">{getInitials(member.fullName)}</span>
                          </div>
                          <p className="font-medium text-xs truncate">{member.fullName}</p>
                          <p className="text-[9px] text-gray-400 truncate">{member.email}</p>
                          {/* Action buttons on hover */}
                          <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex gap-0.5">
                            <button onClick={() => {
                              setTransferMemberId(member.id);
                              setTransferFromPL(team.id);
                              setShowTransfer(true);
                            }}
                              className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600"
                              title="Transfer">
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                            </button>
                            <button onClick={() => handleRemoveMember(member.assignmentId || member.id)}
                              className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                              title="Remove">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Member Button */}
                      <button
                        onClick={() => {
                          setSelectedProductLine(team.id);
                          setSelectedHead(String(team.salesHead!.id));
                          setShowAddMember(true);
                        }}
                        className="border border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-center min-w-[100px] hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer flex flex-col items-center justify-center"
                      >
                        <Plus className="w-5 h-5 text-gray-400 mb-0.5" />
                        <span className="text-[10px] text-gray-400">Add</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== Dialogs ==================== */}

      {/* Assign Head Dialog */}
      <Dialog open={showAssignHead} onOpenChange={setShowAssignHead}>
        <DialogContent className="sm:max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Assign Sales Head</DialogTitle>
            <DialogDescription>Select a user to be the sales head for this product line.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignHead(false)}>Cancel</Button>
            <Button onClick={handleAssignHead} disabled={!selectedUser || actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a user to the team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={!selectedUser || actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Transfer Member</DialogTitle>
            <DialogDescription>Move this member to another product line team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Target Product Line</Label>
              <Select value={transferTarget} onValueChange={setTransferTarget}>
                <SelectTrigger><SelectValue placeholder="Select product line..." /></SelectTrigger>
                <SelectContent>
                  {teams.filter(t => t.id !== transferFromPL && t.salesHead).map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransfer(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={!transferTarget || actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
