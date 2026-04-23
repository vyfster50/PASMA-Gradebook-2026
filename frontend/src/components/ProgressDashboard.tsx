import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardHeader from './DashboardHeader';
import StatsCards from './StatsCards';
import ProgressMatrix from './ProgressMatrix';
import { gradebookAPI } from '../services/api';
import { getStudentAverage } from '../lib/utils';
import { mockCohortProgress } from '../mocks/cohortProgress';
import type { CohortProgressData, DashboardStats } from '../types';

const STORAGE_KEY_COHORT = 'progress_dash_cohort_id';
const STORAGE_KEY_THEME = 'progress_dash_theme';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export default function ProgressDashboard() {
  const [cohortId, setCohortId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COHORT);
    return stored ? Number(stored) : null;
  });
  const [cohortName, setCohortName] = useState('');
  const [data, setData] = useState<CohortProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [theme, setTheme] = useState<string>(() => localStorage.getItem(STORAGE_KEY_THEME) || 'dark');
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!cohortId) {
      setData(null);
      return;
    }

    if (USE_MOCK) {
      setData(mockCohortProgress);
      setCohortName(mockCohortProgress.cohortname);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await gradebookAPI.getCohortProgress(cohortId);
        setData(result);
        setCohortName(result.cohortname);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [cohortId]);

  useEffect(() => {
    if (cohortId) {
      localStorage.setItem(STORAGE_KEY_COHORT, String(cohortId));
    } else {
      localStorage.removeItem(STORAGE_KEY_COHORT);
    }
  }, [cohortId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }, [theme]);

  const stats: DashboardStats = useMemo(() => {
    if (!data || data.students.length === 0) {
      return { overall: 0, atRisk: 0, top: 0, watchlist: 0, total: 0 };
    }

    const avgs = data.students.map((s) => getStudentAverage(s.id, data.courses, data.grades));

    return {
      overall: Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length),
      atRisk: avgs.filter((v) => v < 50).length,
      top: avgs.filter((v) => v >= 75).length,
      watchlist: avgs.filter((v) => v >= 50 && v < 75).length,
      total: data.students.length,
    };
  }, [data]);

  const handleExportCSV = useCallback(() => {
    if (!data) return;

    const allActs = data.courses.flatMap((c) => c.activities.map((a) => ({ ...a, courseid: c.id, courseName: c.shortname })));

    const header = ['Student', 'Student ID', 'Student Number', ...allActs.map((a) => `${a.courseName} - ${a.name}`), 'Average'];

    const rows = data.students.map((s) => {
      const avg = getStudentAverage(s.id, data.courses, data.grades);

      const cells = allActs.map((a) => {
        const pct = data.grades[String(s.id)]?.[String(a.courseid)]?.[String(a.id)]?.percentage;
        return pct != null ? String(Math.round(pct)) : '';
      });

      return [`${s.lastname}, ${s.firstname}`, s.studentid || '', s.studentnumber || '', ...cells, `${avg}%`];
    });

    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${cohortName || 'cohort'}_progress.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, cohortName]);

  const pageClasses = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';

  const legendItems: Array<[string, string]> = [
    ['Below 50', isDark ? 'bg-red-400' : 'bg-red-500'],
    ['50–59', isDark ? 'bg-amber-300' : 'bg-amber-500'],
    ['60–74', isDark ? 'bg-lime-300' : 'bg-lime-500'],
    ['75–100', isDark ? 'bg-emerald-400' : 'bg-emerald-500'],
  ];

  return (
    <div className={`min-h-screen ${pageClasses} p-6 transition-colors duration-300 md:p-8`}>
      <div className="mx-auto max-w-[1800px] space-y-6">
        <DashboardHeader
          search={search}
          onSearchChange={setSearch}
          selectedCohortId={cohortId}
          cohortName={cohortName}
          onCohortSelect={(id, name) => {
            setCohortId(id);
            setCohortName(name);
            setSearch('');
            setFilter('all');
          }}
          onExportCSV={handleExportCSV}
          isDark={isDark}
          onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
        />

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-400 border-t-transparent" />
            <span className={`ml-3 ${mutedText}`}>Loading progress data...</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-300">
            <p className="font-medium">Error loading data</p>
            <p className="mt-1 text-sm opacity-80">{error}</p>
          </div>
        )}

        {data && !loading && (
          <>
            <StatsCards stats={stats} isDark={isDark} />
            <ProgressMatrix
              students={data.students}
              courses={data.courses}
              grades={data.grades}
              searchTerm={search}
              filter={filter}
              isDark={isDark}
              onFilterChange={setFilter}
            />

            <div className={`flex flex-wrap items-center justify-between gap-3 px-1 text-sm ${mutedText}`}>
              <div className="flex flex-wrap gap-4">
                {legendItems.map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div>Total Students: {data.students.length}</div>
            </div>
          </>
        )}

        {!cohortId && !loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="mb-4 text-6xl">📊</div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Select a Cohort to Get Started</h2>
            <p className={`mt-2 ${mutedText}`}>Choose a cohort from the dropdown above to view student progress across all courses.</p>
          </div>
        )}
      </div>
    </div>
  );
}
