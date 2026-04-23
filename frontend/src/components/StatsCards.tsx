import { TrendingUp, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import type { DashboardStats } from '../types';

interface StatsCardsProps {
  stats: DashboardStats;
  isDark: boolean;
}

export default function StatsCards({ stats, isDark }: StatsCardsProps) {
  const panelClasses = isDark
    ? 'border-white/10 bg-white/5 shadow-2xl shadow-black/20'
    : 'border-slate-200 bg-white shadow-xl shadow-slate-200/70';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';

  const cards = [
    {
      label: 'Overall Average',
      value: `${stats.overall}%`,
      icon: <TrendingUp className="h-5 w-5 text-emerald-300" />,
      iconBg: 'bg-emerald-500/20',
      extra: (
        <div className="mt-4">
          <Progress value={stats.overall} className={isDark ? 'h-2 bg-white/10' : 'h-2 bg-slate-200'} />
        </div>
      ),
    },
    {
      label: 'Top Performers',
      value: String(stats.top),
      icon: <CheckCircle2 className="h-5 w-5 text-cyan-300" />,
      iconBg: 'bg-cyan-500/20',
      extra: <p className={`mt-4 text-sm ${mutedText}`}>Average 75% and above</p>,
    },
    {
      label: 'On Watchlist',
      value: String(stats.watchlist),
      icon: <Filter className="h-5 w-5 text-amber-300" />,
      iconBg: 'bg-amber-500/20',
      extra: <p className={`mt-4 text-sm ${mutedText}`}>Average between 50% and 74%</p>,
    },
    {
      label: 'At Risk',
      value: String(stats.atRisk),
      icon: <AlertTriangle className="h-5 w-5 text-red-300" />,
      iconBg: 'bg-red-500/20',
      extra: <p className={`mt-4 text-sm ${mutedText}`}>Average below 50%</p>,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className={`rounded-3xl ${panelClasses}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${mutedText}`}>{card.label}</p>
                <p className="mt-1 text-3xl font-semibold">{card.value}</p>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            {card.extra}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

