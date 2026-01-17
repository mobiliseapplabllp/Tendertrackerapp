import { useState, useEffect } from 'react';

// ESC key handler component
function EscKeyHandler({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  return null;
}
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Plus, Edit, Trash2, Search, Shield, X, Save, UserCheck, UserX } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { userApi } from '../lib/api';
import type { User } from '../lib/types';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'User' as User['role'],
    department: '',
    password: '',
  });

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.getAll();
      if (response.success && response.data) {
        setUsers(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      Admin: 'bg-gray-900 text-white border-transparent',
      Manager: 'bg-gray-100 text-gray-900 border-gray-200',
      User: 'bg-white text-gray-700 border-gray-200',
      Viewer: 'bg-white text-gray-500 border-gray-200 dashed',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'Active'
      ? 'bg-white text-emerald-700 border-emerald-200'
      : 'bg-white text-gray-400 border-gray-200';
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.fullName || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await userApi.create({
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        department: formData.department || null,
        password: formData.password,
      });

      if (response.success) {
        await fetchUsers();
        setIsCreateUserOpen(false);
        setFormData({ fullName: '', email: '', role: 'User', department: '', password: '' });
        setError(null);
      } else {
        setError(response.error || 'Failed to create user');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await userApi.delete(userId);
      if (response.success) {
        await fetchUsers();
      } else {
        setError(response.error || 'Failed to delete user');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
      const response = await userApi.update(user.id, { status: newStatus });
      if (response.success) {
        await fetchUsers();
      } else {
        setError(response.error || 'Failed to update user status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role,
      department: user.department || '',
      password: '', // Don't pre-fill password
    });
    setIsCreateUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!formData.email || !formData.fullName) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const updateData: any = {
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        department: formData.department || null,
      };

      // Only include password if it's provided
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await userApi.update(editingUser.id, updateData);

      if (response.success) {
        await fetchUsers();
        setIsCreateUserOpen(false);
        setEditingUser(null);
        setFormData({ fullName: '', email: '', role: 'User', department: '', password: '' });
        setError(null);
      } else {
        setError(response.error || 'Failed to update user');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl flex items-center gap-2">
            <Users className="w-6 h-6" />
            User Management
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <Users className="w-6 h-6" />
              User Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage users, roles, and permissions
            </p>
          </div>
          <Button onClick={() => setIsCreateUserOpen(!isCreateUserOpen)} data-testid="btn-add-user">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
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

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">
                <Users className="w-4 h-4" />
                All Users
              </TabsTrigger>
              <TabsTrigger value="active">
                <UserCheck className="w-4 h-4" />
                Active ({users.filter(u => u.status === 'Active').length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                <UserX className="w-4 h-4" />
                Inactive ({users.filter(u => u.status === 'Inactive').length})
              </TabsTrigger>
              <TabsTrigger value="roles">
                <Shield className="w-4 h-4" />
                Role Permissions
              </TabsTrigger>
            </TabsList>

            {/* All Users Tab */}
            <TabsContent value="all" className="space-y-4 mt-6">
              {/* Filters */}
              <Card className="p-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Search Users</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Role</Label>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Users Table */}
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-muted-foreground">No users found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p>{user.fullName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.department || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeColor(user.status)}>
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                            </TableCell>
                            <TableCell>
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(user)}
                                >
                                  {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Active Users Tab */}
            <TabsContent value="active" className="space-y-4 mt-6">
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(u => u.status === 'Active' &&
                        (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                        (filterRole === 'all' || u.role === filterRole)
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-muted-foreground">No active users found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.filter(u => u.status === 'Active' &&
                          (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                          (filterRole === 'all' || u.role === filterRole)
                        ).map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p>{user.fullName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.department || 'N/A'}</TableCell>
                            <TableCell>
                              {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                            </TableCell>
                            <TableCell>
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(user)}
                                >
                                  Deactivate
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Inactive Users Tab */}
            <TabsContent value="inactive" className="space-y-4 mt-6">
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.filter(u => u.status === 'Inactive' &&
                        (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                        (filterRole === 'all' || u.role === filterRole)
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <UserX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-muted-foreground">No inactive users found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.filter(u => u.status === 'Inactive' &&
                          (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                          (filterRole === 'all' || u.role === filterRole)
                        ).map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p>{user.fullName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleBadgeColor(user.role)}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.department || 'N/A'}</TableCell>
                            <TableCell>
                              {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                            </TableCell>
                            <TableCell>
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(user)}
                                >
                                  Activate
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            {/* Role Permissions Tab */}
            <TabsContent value="roles" className="space-y-4 mt-6">
              <Card className="p-6">
                <h3 className="mb-4">Role Permissions</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
                    <p className="text-sm text-muted-foreground">
                      Full system access, user management, settings
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Badge className="bg-blue-100 text-blue-800">Manager</Badge>
                    <p className="text-sm text-muted-foreground">
                      Manage tenders, view reports, assign tasks
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Badge className="bg-green-100 text-green-800">User</Badge>
                    <p className="text-sm text-muted-foreground">
                      Create/edit tenders, upload documents
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Badge className="bg-gray-100 text-gray-800">Viewer</Badge>
                    <p className="text-sm text-muted-foreground">
                      Read-only access to tenders and reports
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* User Form Drawer */}
      {isCreateUserOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => {
              setIsCreateUserOpen(false);
              setEditingUser(null);
              setFormData({ fullName: '', email: '', role: 'User', department: '', password: '' });
              setError(null);
            }}
          />
          <EscKeyHandler
            isOpen={isCreateUserOpen}
            onClose={() => {
              setIsCreateUserOpen(false);
              setEditingUser(null);
              setFormData({ fullName: '', email: '', role: 'User', department: '', password: '' });
              setError(null);
            }}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white z-50 shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg">{editingUser ? 'Edit User' : 'Create New User'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {editingUser ? 'Update user information' : 'Add a new user to the system'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={isCreateUserOpen ? handleCreateUser : handleUpdateUser} data-testid="btn-create-user">
                  <Save className="w-4 h-4 mr-2" />
                  {isCreateUserOpen ? 'Create User' : 'Update User'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsCreateUserOpen(false);
                    setEditingUser(null);
                    setFormData({ fullName: '', email: '', role: 'User', department: '', password: '' });
                    setError(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        placeholder="Enter full name"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input
                        type="email"
                        placeholder="user@company.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    {!editingUser && (
                      <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input
                          type="password"
                          placeholder="Enter password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                        />
                      </div>
                    )}
                    {editingUser && (
                      <div className="space-y-2">
                        <Label>New Password (leave blank to keep current)</Label>
                        <Input
                          type="password"
                          placeholder="Enter new password (optional)"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({ ...formData, password: e.target.value })
                          }
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          setFormData({ ...formData, role: value as User['role'] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="User">User</SelectItem>
                          <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input
                        placeholder="e.g., Sales, Operations"
                        value={formData.department}
                        onChange={(e) =>
                          setFormData({ ...formData, department: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
