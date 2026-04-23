import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { gradebookAPI } from '../services/api';
import type { Student, StudentGradeData, GradeItem, Grade } from '../types';

interface StudentGradeDetailProps {
  courseId: number;
  student: Student | null;
}

export default function StudentGradeDetail({ courseId, student }: StudentGradeDetailProps) {
  const [gradeData, setGradeData] = useState<StudentGradeData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !student) {
      setGradeData(null);
      setError(null);
      return;
    }

    const fetchGrades = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await gradebookAPI.getStudentGrades(courseId, student.id);
        setGradeData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grades');
        console.error('Error fetching grades:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [courseId, student]);

  const getGradeForItem = (itemId: number): Grade | undefined => {
    return gradeData?.grades.find(g => g.itemid === itemId);
  };

  const formatGrade = (grade: Grade | undefined, item: GradeItem): string => {
    if (!grade || grade.finalgrade === null || grade.finalgrade === undefined) {
      return '-';
    }
    return `${grade.finalgrade.toFixed(2)} / ${item.grademax.toFixed(2)}`;
  };

  const getPercentage = (grade: Grade | undefined, item: GradeItem): string => {
    if (!grade || grade.finalgrade === null || grade.finalgrade === undefined) {
      return '-';
    }
    if (grade.percentageformatted) {
      return grade.percentageformatted;
    }
    const percentage = (grade.finalgrade / item.grademax) * 100;
    return `${percentage.toFixed(1)}%`;
  };

  const getGradeStatus = (grade: Grade | undefined, item: GradeItem): 'pass' | 'fail' | 'neutral' => {
    if (!grade || grade.finalgrade === null || grade.finalgrade === undefined || !item.gradepass) {
      return 'neutral';
    }
    return grade.finalgrade >= item.gradepass ? 'pass' : 'fail';
  };

  const exportToCSV = () => {
    if (!gradeData) return;

    // Prepare CSV header
    const headers = ['Item Name', 'Type', 'Grade', 'Max Grade', 'Percentage', 'Status', 'Feedback'];

    // Prepare CSV rows
    const rows = gradeData.items.map((item) => {
      const grade = getGradeForItem(item.id);
      const status = getGradeStatus(grade, item);
      const statusText = status === 'pass' ? 'Pass' : status === 'fail' ? 'Below Pass' : 'N/A';

      return [
        `"${item.itemname.replace(/"/g, '""')}"`, // Escape quotes
        item.itemtype,
        grade?.finalgrade !== null && grade?.finalgrade !== undefined ? grade.finalgrade.toFixed(2) : '-',
        item.grademax.toFixed(2),
        getPercentage(grade, item),
        statusText,
        grade?.feedback ? `"${grade.feedback.replace(/"/g, '""')}"` : '-'
      ].join(',');
    });

    // Add course total row at the top
    if (gradeData.coursetotal) {
      const totalRow = [
        '"COURSE TOTAL"',
        'course',
        gradeData.coursetotal.finalgrade !== null && gradeData.coursetotal.finalgrade !== undefined
          ? gradeData.coursetotal.finalgrade.toFixed(2)
          : '-',
        gradeData.coursetotal.grademax.toFixed(2),
        gradeData.coursetotal.percentageformatted || '-',
        '-',
        '-'
      ].join(',');
      rows.unshift(totalRow);
    }

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${student?.lastname}_${student?.firstname}_grades.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!student) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Please select a student to view their grades.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={24} />
        <Typography>Loading grades...</Typography>
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

  if (!gradeData) {
    return null;
  }

  return (
    <Box>
      {/* Student Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {gradeData.student.firstname} {gradeData.student.lastname}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Email: {gradeData.student.email}
            </Typography>
            {gradeData.student.studentid && (
              <Typography variant="body2" color="text.secondary">
                Student ID: {gradeData.student.studentid}
              </Typography>
            )}
            {gradeData.student.studentnumber && (
              <Typography variant="body2" color="text.secondary">
                Student Number: {gradeData.student.studentnumber}
              </Typography>
            )}
          </Box>
          {gradeData.coursename && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Course: {gradeData.coursename}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Course Total */}
      {gradeData.coursetotal && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Course Total
            </Typography>
            <Typography variant="h4">
              {gradeData.coursetotal.finalgrade !== null && gradeData.coursetotal.finalgrade !== undefined
                ? `${gradeData.coursetotal.finalgrade.toFixed(2)} / ${gradeData.coursetotal.grademax.toFixed(2)}`
                : 'Not graded yet'}
            </Typography>
            {gradeData.coursetotal.percentageformatted && (
              <Typography variant="h5" sx={{ mt: 1 }}>
                {gradeData.coursetotal.percentageformatted}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grade Items */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Grade Breakdown
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportToCSV}
          size="small"
        >
          Export to CSV
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Grade</TableCell>
              <TableCell align="right">Percentage</TableCell>
              <TableCell align="right">Max Grade</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gradeData.items.map((item) => {
              const grade = getGradeForItem(item.id);
              const status = getGradeStatus(grade, item);

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {item.itemname}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.itemtype}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {formatGrade(grade, item)}
                  </TableCell>
                  <TableCell align="right">
                    {getPercentage(grade, item)}
                  </TableCell>
                  <TableCell align="right">
                    {item.grademax.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {status === 'pass' && (
                      <Chip label="Pass" color="success" size="small" />
                    )}
                    {status === 'fail' && (
                      <Chip label="Below Pass" color="error" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {gradeData.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    No grade items found for this course
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Feedback Section */}
      {gradeData.grades.some(g => g.feedback) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Feedback
          </Typography>
          {gradeData.items.map((item) => {
            const grade = getGradeForItem(item.id);
            if (!grade?.feedback) return null;

            return (
              <Card key={item.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    {item.itemname}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    {grade.feedback}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
