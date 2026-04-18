import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck, Eye, Pencil, Shield, Crown, Lock,
  RotateCcw, Save, Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { permissionApi } from '../lib/api';

// ========================= Types =========================

interface Permission {
  id: number;
  permissionKey: string;
  label: string;
  description: string;
  group: string;
  sortOrder: number;
  roleViewer: boolean;
  roleUser: boolean;
  roleManager: boolean;
  roleAdmin: boolean;
}

interface PermissionGroup {
  name: string;
  permissions: Permission[];
}

type RoleKey = 'viewer' | 'user' | 'manager' | 'admin';

interface RoleConfig {
  key: RoleKey;
  label: string;
  icon: typeof Eye;
  color: string;
  bgColor: string;
  iconBgColor: string;
  progressColor: string;
  field: keyof Permission;
}

// ========================= Constants =========================

const ROLES: RoleConfig[] = [
  {
    key: 'viewer',
    label: 'Viewer',
    icon: Eye,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 border-gray-200',
    iconBgColor: 'bg-gray-100',
    progressColor: 'bg-gray-400',
    field: 'roleViewer',
  },
  {
    key: 'user',
    label: 'User',
    icon: Pencil,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    iconBgColor: 'bg-blue-100',
    progressColor: 'bg-blue-500',
    field: 'roleUser',
  },
  {
    key: 'manager',
    label: 'Manager',
    icon: Shield,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    iconBgColor: 'bg-emerald-100',
    progressColor: 'bg-emerald-500',
    field: 'roleManager',
  },
  {
    key: 'admin',
    label: 'Admin',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    iconBgColor: 'bg-amber-100',
    progressColor: 'bg-amber-500',
    field: 'roleAdmin',
  },
];

// ========================= Toggle Switch Component =========================

function ToggleSwitch({
  enabled,
  onChange,
  disabled = false,
  locked = false,
}: {
  enabled: boolean;
  onChange?: () => void;
  disabled?: boolean;
  locked?: boolean;
}) {
  const isLocked = locked || disabled;

  return (
    <button
      type="button"
      onClick={isLocked ? undefined : onChange}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${enabled
          ? locked
            ? 'bg-amber-400 cursor-default'
            : 'bg-indigo-600 cursor-pointer hover:bg-indigo-700'
          : isLocked
            ? 'bg-gray-200 cursor-default'
            : 'bg-gray-200 cursor-pointer hover:bg-gray-300'
        }
      `}
      aria-pressed={enabled}
      disabled={isLocked}
    >
      <span
        className={`
          pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow
          ring-0 transition-transform duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      >
        {locked && enabled && (
          <Lock className="h-3 w-3 text-amber-500" />
        )}
      </span>
    </button>
  );
}

// ========================= Role Summary Card =========================

function RoleSummaryCard({
  role,
  enabledCount,
  totalCount,
}: {
  role: RoleConfig;
  enabledCount: number;
  totalCount: number;
}) {
  const Icon = role.icon;
  const percentage = totalCount > 0 ? (enabledCount / totalCount) * 100 : 0;

  return (
    <div className={`rounded-xl border p-4 ${role.bgColor} transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${role.iconBgColor} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${role.color}`} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{role.label}</h3>
          <p className="text-sm text-gray-500">
            {enabledCount} / {totalCount} permissions
          </p>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${role.progressColor} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ========================= Group Header Row =========================

function GroupHeaderRow({
  groupName,
  permissions,
  onBulkToggle,
}: {
  groupName: string;
  permissions: Permission[];
  onBulkToggle: (group: string, role: RoleKey, enabled: boolean) => void;
}) {
  return (
    <tr className="bg-gray-50 border-t-2 border-gray-200">
      <td className="px-4 py-3" colSpan={1}>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {groupName}
        </span>
      </td>
      {ROLES.map((role) => {
        const isAdmin = role.key === 'admin';
        const allEnabled = permissions.every(
          (p) => p[role.field as keyof Permission] as boolean
        );
        const noneEnabled = permissions.every(
          (p) => !(p[role.field as keyof Permission] as boolean)
        );

        return (
          <td key={role.key} className="px-4 py-3 text-center">
            {isAdmin ? (
              <span className="text-xs font-medium text-amber-600">Always On</span>
            ) : (
              <button
                onClick={() => onBulkToggle(groupName, role.key, !allEnabled)}
                className={`text-xs font-medium px-2 py-1 rounded transition-colors duration-150 ${
                  allEnabled
                    ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                    : noneEnabled
                    ? 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                    : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                {allEnabled ? 'All on' : noneEnabled ? 'All off' : 'Mixed'}
              </button>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ========================= Permission Row =========================

function PermissionRow({
  permission,
  onToggle,
}: {
  permission: Permission;
  onToggle: (permissionKey: string, role: RoleKey, enabled: boolean) => void;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-100">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{permission.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{permission.description}</p>
        </div>
      </td>
      {ROLES.map((role) => {
        const isAdmin = role.key === 'admin';
        const enabled = permission[role.field as keyof Permission] as boolean;

        return (
          <td key={role.key} className="px-4 py-3 text-center">
            <div className="flex justify-center">
              <ToggleSwitch
                enabled={enabled}
                onChange={() => onToggle(permission.permissionKey, role.key, !enabled)}
                locked={isAdmin}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// ========================= Main Page Component =========================

export function RolePermissionsPage() {
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<
    { permissionKey: string; role: string; enabled: boolean }[]
  >([]);
  const [resetting, setResetting] = useState(false);

  // Fetch permission matrix
  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await permissionApi.getMatrix();
      if (response.success && response.data?.groups) {
        setGroups(response.data.groups);
      } else {
        setError(response.error || 'Failed to load permissions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // All permissions flattened
  const allPermissions = useMemo(() => {
    return groups.flatMap((g) => g.permissions);
  }, [groups]);

  // Compute role counts
  const roleCounts = useMemo(() => {
    const total = allPermissions.length;
    return ROLES.map((role) => ({
      role,
      enabled: allPermissions.filter((p) => p[role.field as keyof Permission] as boolean).length,
      total,
    }));
  }, [allPermissions]);

  // Handle single toggle (optimistic update)
  const handleToggle = useCallback(
    (permissionKey: string, role: RoleKey, enabled: boolean) => {
      if (role === 'admin') return; // Admin is always on

      // Optimistic update
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          permissions: group.permissions.map((p) => {
            if (p.permissionKey === permissionKey) {
              const fieldMap: Record<string, string> = {
                viewer: 'roleViewer',
                user: 'roleUser',
                manager: 'roleManager',
              };
              return { ...p, [fieldMap[role]]: enabled };
            }
            return p;
          }),
        }))
      );

      // Track pending change
      setPendingChanges((prev) => {
        const filtered = prev.filter(
          (c) => !(c.permissionKey === permissionKey && c.role === role)
        );
        return [...filtered, { permissionKey, role, enabled }];
      });
    },
    []
  );

  // Handle bulk toggle for a group
  const handleBulkToggle = useCallback(
    (groupName: string, role: RoleKey, enabled: boolean) => {
      if (role === 'admin') return;

      const fieldMap: Record<string, string> = {
        viewer: 'roleViewer',
        user: 'roleUser',
        manager: 'roleManager',
      };

      // Optimistic update
      setGroups((prev) =>
        prev.map((group) => {
          if (group.name === groupName) {
            return {
              ...group,
              permissions: group.permissions.map((p) => ({
                ...p,
                [fieldMap[role]]: enabled,
              })),
            };
          }
          return group;
        })
      );

      // Track as single bulk change (clear individual changes for this group+role)
      setPendingChanges((prev) => {
        const groupPerms = groups.find((g) => g.name === groupName)?.permissions || [];
        const groupKeys = new Set(groupPerms.map((p) => p.permissionKey));
        const filtered = prev.filter(
          (c) => !(groupKeys.has(c.permissionKey) && c.role === role)
        );
        // Add a bulk marker
        return [
          ...filtered,
          { permissionKey: `__bulk__${groupName}`, role, enabled },
        ];
      });
    },
    [groups]
  );

  // Save all pending changes
  const handleSave = useCallback(async () => {
    if (pendingChanges.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      // Separate bulk and individual changes
      const bulkChanges = pendingChanges.filter((c) =>
        c.permissionKey.startsWith('__bulk__')
      );
      const individualChanges = pendingChanges.filter(
        (c) => !c.permissionKey.startsWith('__bulk__')
      );

      // Process bulk changes
      for (const change of bulkChanges) {
        const groupName = change.permissionKey.replace('__bulk__', '');
        await permissionApi.bulkUpdate({
          group: groupName,
          role: change.role,
          enabled: change.enabled,
        });
      }

      // Process individual changes
      for (const change of individualChanges) {
        await permissionApi.updatePermission({
          permissionKey: change.permissionKey,
          role: change.role,
          enabled: change.enabled,
        });
      }

      setPendingChanges([]);
      setSuccessMessage('Permissions saved successfully');

      // Refresh from server to ensure consistency
      await fetchMatrix();
    } catch (err: any) {
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, fetchMatrix]);

  // Reset to defaults
  const handleReset = useCallback(async () => {
    setResetting(true);
    setError(null);
    try {
      const response = await permissionApi.resetDefaults();
      if (response.success) {
        setPendingChanges([]);
        setSuccessMessage('Permissions reset to defaults');
        await fetchMatrix();
      } else {
        setError(response.error || 'Failed to reset permissions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset permissions');
    } finally {
      setResetting(false);
    }
  }, [fetchMatrix]);

  // ========================= Render =========================

  if (loading) {
    return (
      <div className="h-full bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Role Permissions</h1>
                <p className="text-sm text-muted-foreground">
                  Control what each role can do. Toggle individual permissions on or off for every role type.
                </p>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="mt-3 text-sm text-gray-500">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Role Permissions</h1>
                <p className="text-sm text-muted-foreground">
                  Control what each role can do. Toggle individual permissions on or off for every role type.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                disabled={resetting || saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Reset Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={pendingChanges.length === 0 || saving || resetting}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  pendingChanges.length > 0
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
                {pendingChanges.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-white/20 rounded-full">
                    {pendingChanges.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
        {/* Status Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Role Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {roleCounts.map(({ role, enabled, total }) => (
            <RoleSummaryCard
              key={role.key}
              role={role}
              enabledCount={enabled}
              totalCount={total}
            />
          ))}
        </div>

        {/* Permission Matrix Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[40%]">
                    Permission
                  </th>
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    return (
                      <th
                        key={role.key}
                        className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <Icon className={`w-4 h-4 ${role.color}`} />
                          <span>{role.label}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <GroupSection
                    key={group.name}
                    group={group}
                    onToggle={handleToggle}
                    onBulkToggle={handleBulkToggle}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unsaved Changes Indicator */}
        {pendingChanges.length > 0 && (
          <div className="mt-4 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              You have {pendingChanges.length} unsaved change{pendingChanges.length !== 1 ? 's' : ''}. Click "Save Changes" to apply.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================= Group Section =========================

function GroupSection({
  group,
  onToggle,
  onBulkToggle,
}: {
  group: PermissionGroup;
  onToggle: (permissionKey: string, role: RoleKey, enabled: boolean) => void;
  onBulkToggle: (group: string, role: RoleKey, enabled: boolean) => void;
}) {
  return (
    <>
      <GroupHeaderRow
        groupName={group.name}
        permissions={group.permissions}
        onBulkToggle={onBulkToggle}
      />
      {group.permissions.map((permission) => (
        <PermissionRow
          key={permission.permissionKey}
          permission={permission}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}
