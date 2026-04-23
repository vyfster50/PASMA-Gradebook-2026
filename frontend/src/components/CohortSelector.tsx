import { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import { gradebookAPI } from '../services/api';
import type { Cohort } from '../types';

interface CohortSelectorProps {
  courseId: number;
  onCohortSelect: (cohort: Cohort | null) => void;
}

export default function CohortSelector({ courseId, onCohortSelect }: CohortSelectorProps) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setError('No course ID provided');
      return;
    }

    const fetchCohorts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await gradebookAPI.getCohorts(courseId);
        setCohorts(data);
        if (data.length === 0) {
          setError('No cohorts found for this course');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cohorts');
        console.error('Error fetching cohorts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCohorts();
  }, [courseId]);

  const handleChange = (event: SelectChangeEvent) => {
    const cohortId = event.target.value;
    setSelectedCohortId(cohortId);

    const selectedCohort = cohorts.find(c => c.id.toString() === cohortId);
    onCohortSelect(selectedCohort || null);
  };

  if (!courseId) {
    return (
      <Alert severity="warning">
        Please configure a course ID in your environment settings.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={24} />
        <Typography>Loading cohorts...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ minWidth: 300 }}>
      <FormControl fullWidth>
        <InputLabel id="cohort-select-label">Select Cohort</InputLabel>
        <Select
          labelId="cohort-select-label"
          id="cohort-select"
          value={selectedCohortId}
          label="Select Cohort"
          onChange={handleChange}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {cohorts.map((cohort) => (
            <MenuItem key={cohort.id} value={cohort.id.toString()}>
              {cohort.name}
              {cohort.idnumber && ` (${cohort.idnumber})`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {selectedCohortId && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {cohorts.find(c => c.id.toString() === selectedCohortId)?.description}
        </Typography>
      )}
    </Box>
  );
}
