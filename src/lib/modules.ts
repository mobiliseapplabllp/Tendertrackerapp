import {
  BarChart3, TrendingUp, FileText, Megaphone, FolderOpen, Settings,
  Home, Search, Globe, Building2, Users, Target, Tag,
  FolderArchive, Bell, ShieldCheck, Terminal,
  Rocket, Share2, Mail, CalendarDays, FormInput, PieChart, UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface ModuleItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string; // tailwind color name
  defaultView: string;
  items: ModuleItem[];
  roles: string[]; // which roles can access this module
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'dashboard-reports',
    name: 'Dashboard & Reports',
    description: 'Overview, analytics & reporting',
    icon: BarChart3,
    color: 'blue',
    defaultView: 'dashboard',
    items: [
      { id: 'dashboard', icon: Home, label: 'Dashboard' },
      { id: 'reports', icon: BarChart3, label: 'Reports & Analytics' },
    ],
    roles: ['admin', 'manager', 'superadmin', 'user', 'viewer'],
  },
  {
    id: 'sales-crm',
    name: 'Sales CRM',
    description: 'Leads, companies & sales pipeline',
    icon: TrendingUp,
    color: 'indigo',
    defaultView: 'leads',
    items: [
      { id: 'leads', icon: FileText, label: 'Leads' },
      { id: 'sales-hub', icon: TrendingUp, label: 'Sales Hub' },
      { id: 'companies', icon: Building2, label: 'Companies & Contacts' },
      { id: 'apollo-search', icon: Search, label: 'Apollo Search' },
      { id: 'team-structure', icon: Users, label: 'Team Structure' },
      { id: 'sales-targets', icon: Target, label: 'Sales Targets' },
      { id: 'product-catalog', icon: Tag, label: 'Product Catalog' },
    ],
    roles: ['admin', 'manager', 'superadmin', 'user', 'viewer'],
  },
  {
    id: 'tender-management',
    name: 'Tender Management',
    description: 'Tenders, scouting & AI search',
    icon: FileText,
    color: 'orange',
    defaultView: 'tenders',
    items: [
      { id: 'tenders', icon: FileText, label: 'Tender Master' },
      { id: 'tender-scout', icon: Search, label: 'Tender Scout' },
      { id: 'ai-search', icon: Globe, label: 'AI Search' },
    ],
    roles: ['admin', 'manager', 'superadmin', 'user', 'viewer'],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Campaigns, social media & analytics',
    icon: Megaphone,
    color: 'pink',
    defaultView: 'campaigns',
    items: [
      { id: 'campaigns', icon: Rocket, label: 'Campaign Builder' },
      { id: 'social-media', icon: Share2, label: 'Social Media' },
      { id: 'email-marketing', icon: Mail, label: 'Email Marketing' },
      { id: 'content-calendar', icon: CalendarDays, label: 'Content Calendar' },
      { id: 'lead-capture', icon: FormInput, label: 'Lead Capture' },
      { id: 'campaign-analytics', icon: PieChart, label: 'Campaign Analytics' },
      { id: 'audience-segments', icon: UsersRound, label: 'Audience Segments' },
    ],
    roles: ['admin', 'manager', 'superadmin', 'user'],
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Files, collateral & materials',
    icon: FolderOpen,
    color: 'emerald',
    defaultView: 'documents',
    items: [
      { id: 'documents', icon: FolderOpen, label: 'Documents' },
      { id: 'collateral', icon: FolderArchive, label: 'Collateral Repository' },
    ],
    roles: ['admin', 'manager', 'superadmin', 'user', 'viewer'],
  },
  {
    id: 'administration',
    name: 'Administration',
    description: 'Users, settings & configuration',
    icon: Settings,
    color: 'gray',
    defaultView: 'users',
    items: [
      { id: 'users', icon: Users, label: 'User Management' },
      { id: 'role-permissions', icon: ShieldCheck, label: 'Role Permissions' },
      { id: 'categories', icon: Tag, label: 'Categories & Tags' },
      { id: 'email-settings', icon: Bell, label: 'Email Alerts' },
      { id: 'administration', icon: ShieldCheck, label: 'Administration' },
      { id: 'scout-config', icon: Settings, label: 'Scout Configuration' },
      { id: 'api-playground', icon: Terminal, label: 'API Playground' },
      { id: 'settings', icon: Settings, label: 'Settings' },
    ],
    roles: ['admin'],
  },
];

// Get the module that contains a specific view ID
export function getModuleForView(viewId: string): ModuleConfig | undefined {
  return MODULES.find(m => m.items.some(item => item.id === viewId));
}

// Get modules accessible by a role
export function getAccessibleModules(role: string): ModuleConfig[] {
  const r = (role || 'user').toLowerCase();
  return MODULES.filter(m => m.roles.includes(r));
}

// Get default module for a role
export function getDefaultModule(role: string): string {
  const r = (role || 'user').toLowerCase();
  if (r === 'user' || r === 'viewer') return 'sales-crm';
  return 'dashboard-reports';
}
