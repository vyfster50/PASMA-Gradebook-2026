import { Search, Download, GraduationCap, Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import CohortDropdown from './CohortDropdown';

interface DashboardHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedCohortId: number | null;
  cohortName: string;
  onCohortSelect: (id: number | null, name: string) => void;
  onExportCSV: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function DashboardHeader({
  search,
  onSearchChange,
  selectedCohortId,
  cohortName,
  onCohortSelect,
  onExportCSV,
  isDark,
  onToggleTheme,
}: DashboardHeaderProps) {
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const titleText = isDark ? 'text-white' : 'text-slate-900';
  const softPill = isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-white text-slate-600';
  const stickyShell = isDark
    ? 'rounded-[28px] border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/20 backdrop-blur-xl'
    : 'rounded-[28px] border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur-xl';
  const inputClasses = isDark
    ? 'border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-400'
    : 'border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-500';
  const buttonOutline = isDark
    ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
    : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100';

  return (
    <div className={stickyShell}>
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${softPill}`}>
            <GraduationCap className="h-4 w-4" />
            Academic Performance Dashboard
          </div>
          <div>
            <h1 className={`text-3xl font-semibold tracking-tight md:text-4xl ${titleText}`}>Student Progress Overview</h1>
            <p className={`mt-1 ${mutedText}`}>
              {cohortName ? `Viewing: ${cohortName}` : 'Select a cohort to view all students across all courses'}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[500px]">
          <div className="flex items-center gap-3">
            <CohortDropdown onSelect={onCohortSelect} selectedCohortId={selectedCohortId} isDark={isDark} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative min-w-[260px] flex-1">
              <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${mutedText}`} />
              <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search student..." className={inputClasses} />
            </div>
            <Button variant="outline" className={buttonOutline} onClick={onExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" className={buttonOutline} onClick={onToggleTheme}>
              {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {isDark ? 'Light' : 'Dark'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

