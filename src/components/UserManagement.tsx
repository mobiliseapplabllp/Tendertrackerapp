import { useState } from 'react';
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
import { Users, Plus, Edit, Trash2, Search, Shield } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  department: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@company.com',
      role: 'admin',
      department: 'Management',
      status: 'active',
      lastLogin: '2025-11-22T10:30:00',
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'manager',
      department: 'Sales',
      status: 'active',
      lastLogin: '2025-11-22T09:15:00',
      createdAt: '2024-02-20',
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike.davis@company.com',
      role: 'user',
      department: 'Operations',
      status: 'active',
      lastLogin: '2025-11-21T16:45:00',
      createdAt: '2024-03-10',
    },
    {
      id: '4',
      name: 'Emily Brown',
      email: 'emily.brown@company.com',
      role: 'viewer',
      department: 'Finance',
      status: 'inactive',
      lastLogin: '2025-11-10T14:20:00',
      createdAt: '2024-04-05',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as User['role'],
    department: '',
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      user: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const handleCreateUser = () => {
    const newUser: User = {
      id: `user_${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department: formData.department,
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers([...users, newUser]);
    setIsCreateUserOpen(false);
    setFormData({ name: '', email: '', role: 'user', department: '' });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter((u) => u.id !== userId));
    }
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(
      users.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
          : u
      )
    );
  };

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
          <Button onClick={() => setIsCreateUserOpen(!isCreateUserOpen)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Create User Form */}
          {isCreateUserOpen && (
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Create New User
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
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
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Input
                    placeholder="e.g., Sales, Operations"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreateUser}>Create User</Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateUserOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {/* Role Permissions Info */}
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
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Users Table */}
          <Card>
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
                          <p>{user.name}</p>
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
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(user.status)}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.lastLogin).toLocaleString()}
                      </TableCell>
                      <TableCell>{user.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id)}
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button variant="ghost" size="icon">
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
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
