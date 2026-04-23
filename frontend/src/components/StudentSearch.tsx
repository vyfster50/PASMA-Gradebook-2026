import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Typography,
  InputAdornment,
  TableSortLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { gradebookAPI } from '../services/api';
import type { Student } from '../types';

interface StudentSearchProps {
  courseId: number;
  cohortId: number | null;
  onStudentSelect: (student: Student | null) => void;
}

type SortField = 'firstname' | 'lastname' | 'studentid' | 'studentnumber';
type SortOrder = 'asc' | 'desc';

export default function StudentSearch({ courseId, cohortId, onStudentSelect }: StudentSearchProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('lastname');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (!courseId || !cohortId) {
      setStudents([]);
      setError(null);
      return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await gradebookAPI.getStudents(courseId, cohortId);
        setStudents(data);
        if (data.length === 0) {
          setError('No students found in this cohort');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load students');
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [courseId, cohortId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = students.filter(
        (student) =>
          student.firstname.toLowerCase().includes(term) ||
          student.lastname.toLowerCase().includes(term) ||
          student.email.toLowerCase().includes(term) ||
          student.studentid?.toLowerCase().includes(term) ||
          student.studentnumber?.toLowerCase().includes(term)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortField === 'firstname') {
        aVal = a.firstname.toLowerCase();
        bVal = b.firstname.toLowerCase();
      } else if (sortField === 'lastname') {
        aVal = a.lastname.toLowerCase();
        bVal = b.lastname.toLowerCase();
      } else if (sortField === 'studentid') {
        aVal = a.studentid?.toLowerCase() || '';
        bVal = b.studentid?.toLowerCase() || '';
      } else if (sortField === 'studentnumber') {
        aVal = a.studentnumber?.toLowerCase() || '';
        bVal = b.studentnumber?.toLowerCase() || '';
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [students, searchTerm, sortField, sortOrder]);

  const handleRowClick = (student: Student) => {
    setSelectedStudentId(student.id);
    onStudentSelect(student);
  };

  if (!cohortId) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Please select a cohort to view students.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={24} />
        <Typography>Loading students...</Typography>
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
    <Box>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name, email, student ID, or student number..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {filteredAndSortedStudents.length} student{filteredAndSortedStudents.length !== 1 ? 's' : ''} found
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'lastname'}
                  direction={sortField === 'lastname' ? sortOrder : 'asc'}
                  onClick={() => handleSort('lastname')}
                >
                  Last Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'firstname'}
                  direction={sortField === 'firstname' ? sortOrder : 'asc'}
                  onClick={() => handleSort('firstname')}
                >
                  First Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Email</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'studentid'}
                  direction={sortField === 'studentid' ? sortOrder : 'asc'}
                  onClick={() => handleSort('studentid')}
                >
                  Student ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'studentnumber'}
                  direction={sortField === 'studentnumber' ? sortOrder : 'asc'}
                  onClick={() => handleSort('studentnumber')}
                >
                  Student Number
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedStudents.map((student) => (
              <TableRow
                key={student.id}
                hover
                onClick={() => handleRowClick(student)}
                selected={selectedStudentId === student.id}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{student.lastname}</TableCell>
                <TableCell>{student.firstname}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>{student.studentid || '-'}</TableCell>
                <TableCell>{student.studentnumber || '-'}</TableCell>
              </TableRow>
            ))}
            {filteredAndSortedStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">
                    No students match your search criteria
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
