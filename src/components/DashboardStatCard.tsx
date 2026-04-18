import { Card } from './ui/card';
import { type LucideIcon } from 'lucide-react';

interface DashboardStatCardProps {
  title: string;
  value: string;
  rawValue?: number;
  icon: LucideIcon;
  color: string;
  formatCurrency?: (amount: number | null | undefined) => string;
}

export function DashboardStatCard({
  title,
  value,
  icon: Icon,
  color,
}: DashboardStatCardProps) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{title}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
      </div>
    </Card>
  );
}
