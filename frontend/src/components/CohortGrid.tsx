import { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  Paper,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import { gradebookAPI } from '../services/api';
import type { Student, CohortGradeData } from '../types';

interface CohortGridProps {
  courseId: number;
  cohortId: number | null;
  onStudentSelect?: (student: Student | null) => void;
}

interface StudentGradeRow {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  studentid: string;
  studentnumber: string;
  coursetotal: string;
  percentage: string;
  status: string;
}

export default function CohortGrid({ courseId, cohortId, onStudentSelect }: CohortGridProps) {
  const [cohortData, setCohortData] = useState<CohortGradeData | null>(null);
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadTime, setLoadTime] = useState<number | null>(null);

  useEffect(() => {
    if (!courseId || !cohortId) {
      setCohortData(null);
      setRows([]);
      setError(null);
      return;
    }

    const fetchCohortData = async () => {
      setLoading(true);
      setError(null);
      const startTime = performance.now();

      try {
        // Single bulk request instead of N individual requests
        const data = await gradebookAPI.getCohortGrades(courseId, cohortId);
        setCohortData(data);
        setLoadTime(Math.round(performance.now() - startTime));

        if (data.students.length === 0) {
          setError('No students found in this cohort');
          setRows([]);
          setLoading(false);
          return;
        }

        // Build rows from bulk response
        const gridRows: StudentGradeRow[] = data.students.map((entry) => {
          const { student, coursetotal } = entry;
          const total = coursetotal?.finalgrade;
          const grademax = coursetotal?.grademax || 100;
          const percentage = coursetotal?.percentageformatted || '-';

          let status = 'N/A';
          if (total !== undefined && total !== null) {
            const gradepass = coursetotal?.gradepass;
            if (gradepass !== undefined && gradepass !== null && gradepass > 0) {
              status = total >= gradepass ? 'Pass' : 'Fail';
            }
          }

          return {
            id: student.id,
            firstname: student.firstname,
            lastname: student.lastname,
            email: student.email,
            studentid: student.studentid || '-',
            studentnumber: student.studentnumber || '-',
            coursetotal: total !== undefined && total !== null
              ? `${total.toFixed(2)} / ${grademax.toFixed(2)}`
              : 'N/A',
            percentage,
            status,
          };
        });

        setRows(gridRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cohort data');
        console.error('Error fetching cohort data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCohortData();
  }, [courseId, cohortId]);

  const columns: GridColDef[] = [
    {
      field: 'lastname',
      headerName: 'Last Name',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'firstname',
      headerName: 'First Name',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'studentid',
      headerName: 'Student ID',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'studentnumber',
      headerName: 'Student Number',
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.5,
      minWidth: 180,
    },
    {
      field: 'coursetotal',
      headerName: 'Course Total',
      flex: 1,
      minWidth: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'percentage',
      headerName: 'Percentage',
      flex: 0.8,
      minWidth: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 90,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const status = params.value as string;
        let color = 'inherit';
        if (status === 'Pass') color = 'success.main';
        if (status === 'Fail') color = 'error.main';

        return (
          <Typography variant="body2" color={color} fontWeight="medium">
            {status}
          </Typography>
        );
      },
    },
  ];

  const handleRowClick = (params: any) => {
    if (!cohortData || !onStudentSelect) return;
    const entry = cohortData.students.find(s => s.student.id === params.id);
    if (entry) {
      onStudentSelect(entry.student);
    }
  };

  if (!cohortId) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Please select a cohort to view the grade grid.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={24} />
        <Typography>Loading cohort grade data...</Typography>
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
    <Paper sx={{ height: 600, width: '100%' }}>
      {loadTime !== null && (
        <Box sx={{ px: 2, py: 0.5, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {rows.length} students loaded
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {loadTime}ms
          </Typography>
        </Box>
      )}
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25, page: 0 },
          },
          sorting: {
            sortModel: [{ field: 'lastname', sort: 'asc' }],
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        onRowClick={handleRowClick}
        sx={{
          '& .MuiDataGrid-row:hover': {
            cursor: 'pointer',
          },
        }}
        disableRowSelectionOnClick
      />
    </Paper>
  );
}
