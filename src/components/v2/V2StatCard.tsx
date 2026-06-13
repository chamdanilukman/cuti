import React from 'react';
import { LucideIcon, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface V2StatCardProps {
  title: string;
  value: number | string;
  helper: string;
  icon: LucideIcon;
  tone: 'blue' | 'amber' | 'orange' | 'emerald' | 'rose' | 'slate';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
    tone?: 'emerald' | 'amber' | 'rose' | 'slate';
  };
}

const toneClasses = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  orange: 'bg-orange-50 text-orange-700 ring-orange-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const trendColors = {
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  slate: 'text-slate-500',
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const V2StatCard: React.FC<V2StatCardProps> = ({ title, value, helper, icon: Icon, tone, trend }) => {
  const TrendIcon = trend ? trendIcons[trend.direction] : null;
  const trendColorClass = trend?.tone ? trendColors[trend.tone] : 'text-slate-500';

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft hover:shadow-card transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-lg p-2 ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-extrabold tabular-nums text-slate-900">
        {value}
      </p>
      <p className={`mt-1 text-xs font-medium flex items-center gap-1 ${trend ? trendColorClass : 'text-slate-500'}`}>
        {TrendIcon && <TrendIcon className="h-3 w-3" />}
        {trend ? trend.label : helper}
      </p>
    </article>
  );
};

export default V2StatCard;
