import { useEffect, useState } from 'react';
import { gradebookAPI } from '../services/api';
import type { CohortWithCount } from '../types';

interface CohortDropdownProps {
  onSelect: (cohortId: number | null, cohortName: string) => void;
  selectedCohortId: number | null;
  isDark: boolean;
}

export default function CohortDropdown({ onSelect, selectedCohortId, isDark }: CohortDropdownProps) {
  const [cohorts, setCohorts] = useState<CohortWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCohorts = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await gradebookAPI.getAllCohorts();
        setCohorts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cohorts');
      } finally {
        setLoading(false);
      }
    };

    fetchCohorts();
  }, []);

  const selectClasses = isDark
    ? 'border-white/10 bg-white/5 text-white'
    : 'border-slate-200 bg-white text-slate-900';

  if (loading) {
    return (
      <select disabled className={`rounded-lg border px-3 py-2 text-sm ${selectClasses}`}>
        <option>Loading cohorts...</option>
      </select>
    );
  }

  if (error) {
    return (
      <select disabled className="rounded-lg border border-red-400 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        <option>Error: {error}</option>
      </select>
    );
  }

  return (
    <select
      value={selectedCohortId ?? ''}
      onChange={(e) => {
        const id = e.target.value ? Number(e.target.value) : null;
        const name = cohorts.find((c) => c.id === id)?.name ?? '';
        onSelect(id, name);
      }}
      className={`min-w-[220px] rounded-lg border px-3 py-2 text-sm ${selectClasses}`}
    >
      <option value="">Select cohort...</option>
      {cohorts.map((cohort) => (
        <option key={cohort.id} value={cohort.id}>
          {cohort.name} ({cohort.membercount} students)
        </option>
      ))}
    </select>
  );
}

