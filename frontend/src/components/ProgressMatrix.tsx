import { useMemo } from 'react';
import { BookOpen, FileText, HelpCircle, MessageSquare, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getScoreStyle, getScoreDot, getInitials, getStudentAverage, getDividerIndices } from '../lib/utils';
import type { Student, CourseColumn, GradesMap } from '../types';

interface ProgressMatrixProps {
  students: Student[];
  courses: CourseColumn[];
  grades: GradesMap;
  searchTerm: string;
  filter: string;
  isDark: boolean;
  onFilterChange: (filter: string) => void;
}

function getActivityIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'h5pactivity':
    case 'hvp':
      return <Play className="h-3 w-3" aria-hidden="true" />;
    case 'lesson':
      return <BookOpen className="h-3 w-3" aria-hidden="true" />;
    case 'assign':
      return <FileText className="h-3 w-3" aria-hidden="true" />;
    case 'quiz':
      return <HelpCircle className="h-3 w-3" aria-hidden="true" />;
    case 'forum':
      return <MessageSquare className="h-3 w-3" aria-hidden="true" />;
    default:
      return null;
  }
}

export default function ProgressMatrix({
  students,
  courses,
  grades,
  searchTerm,
  filter,
  isDark,
  onFilterChange,
}: ProgressMatrixProps) {
  const allActivities = useMemo(
    () => courses.flatMap((course) => course.activities.map((a) => ({ ...a, courseid: course.id }))),
    [courses],
  );

  const courseGroups = useMemo(
    () =>
      courses.map((c) => ({
        id: c.id,
        shortname: c.shortname,
        span: c.activities.length,
        sublabel: `${c.activities.length} activities`,
      })),
    [courses],
  );

  const dividers = useMemo(() => getDividerIndices(courses), [courses]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const avg = getStudentAverage(s.id, courses, grades);
      const name = `${s.firstname} ${s.lastname}`.toLowerCase();
      const sid = (s.studentid ?? '').toLowerCase();
      const snum = (s.studentnumber ?? '').toLowerCase();
      const mail = (s.email ?? '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || name.includes(term) || sid.includes(term) || snum.includes(term) || mail.includes(term);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'atRisk' && avg < 50) ||
        (filter === 'watchlist' && avg >= 50 && avg < 60) ||
        (filter === 'doingWell' && avg >= 60 && avg < 75) ||
        (filter === 'top' && avg >= 75);

      return matchesSearch && matchesFilter;
    });
  }, [students, courses, grades, searchTerm, filter]);

  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const titleText = isDark ? 'text-white' : 'text-slate-900';
  const labelText = isDark ? 'text-slate-300' : 'text-slate-700';
  const divider = isDark ? 'border-white/10' : 'border-slate-200';
  const panelClasses = isDark
    ? 'border-white/10 bg-white/5 shadow-2xl shadow-black/20'
    : 'border-slate-200 bg-white shadow-xl shadow-slate-200/70';
  const tableHead = isDark ? 'bg-slate-900/95' : 'bg-slate-100/95';
  const courseBand = isDark ? 'bg-white/[0.06]' : 'bg-slate-50';
  const topRow = isDark ? 'border-b border-white/10 bg-white/[0.03]' : 'border-b border-slate-200 bg-slate-50';
  const bodyRow = isDark ? 'border-b border-white/5 hover:bg-white/[0.03]' : 'border-b border-slate-200 hover:bg-slate-50';
  const avatar = isDark
    ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200'
    : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700';
  const activeFilter = isDark ? 'bg-white text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800';
  const inactiveFilter = isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-white text-slate-700 hover:bg-slate-100';

  const filterButtons: Array<[string, string]> = [
    ['all', 'All'],
    ['top', '75%+'],
    ['doingWell', '60–74%'],
    ['watchlist', '50–59%'],
    ['atRisk', 'Below 50%'],
  ];

  const getCellValue = (studentId: number, courseId: number, itemId: number): number | null => {
    return grades[String(studentId)]?.[String(courseId)]?.[String(itemId)]?.percentage ?? null;
  };

  const minWidth = 220 + allActivities.length * 120 + 130;

  if (courses.length === 0) {
    return (
      <Card className={`overflow-hidden rounded-[28px] ${panelClasses}`}>
        <CardContent className="p-8 text-center">
          <p className={mutedText}>No courses found for this cohort.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden rounded-[28px] ${panelClasses}`}>
      <CardHeader className={`border-b ${divider} ${isDark ? 'bg-white/5' : 'bg-slate-50/90'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl">Student Progress Matrix</CardTitle>
            <CardDescription className={`mt-1 ${mutedText}`}>
              {courses.length} course{courses.length !== 1 ? 's' : ''} · {allActivities.length} activities · {filteredStudents.length} /{' '}
              {students.length} students shown
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant="outline"
                className={`rounded-full ${isDark ? 'border-white/10' : 'border-slate-200'} ${filter === key ? activeFilter : inactiveFilter}`}
                onClick={() => onFilterChange(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[72vh] overflow-auto">
          <table className="w-full text-sm" style={{ minWidth: `${minWidth}px` }}>
            <thead className={tableHead}>
              <tr className={topRow}>
                <th className={`sticky left-0 top-0 z-40 min-w-[220px] px-5 py-3 text-left font-medium ${mutedText} ${tableHead}`}>Courses</th>
                {courseGroups.map((group, index) => (
                  <th
                    key={group.id}
                    colSpan={group.span}
                    className={`sticky top-0 z-30 px-0 py-0 text-center ${tableHead} ${index < courseGroups.length - 1 ? `border-r ${divider}` : ''}`}
                  >
                    <div className={`flex w-full flex-col items-center justify-center border-b px-4 py-4 ${divider} ${courseBand}`}>
                      <span className={`text-base font-bold tracking-wide ${titleText}`}>{group.shortname}</span>
                      <span className={`mt-0.5 text-xs ${mutedText}`}>{group.sublabel}</span>
                    </div>
                  </th>
                ))}
                <th className={`sticky top-0 z-30 min-w-[100px] px-4 py-3 text-center font-medium ${mutedText} ${tableHead}`}>Summary</th>
              </tr>

              <tr className={`border-b ${divider}`}>
                <th className={`sticky left-0 top-[72px] z-40 min-w-[220px] px-5 py-3 text-left font-medium ${labelText} ${tableHead}`}>Student</th>
                {allActivities.map((activity, index) => (
                  <th
                    key={`${activity.courseid}-${activity.id}`}
                    className={`sticky top-[72px] z-20 min-w-[110px] px-2 py-3 text-center font-medium ${labelText} ${tableHead} ${dividers.has(index) ? `border-r ${divider}` : ''}`}
                  >
                    <div className="flex flex-col items-center gap-0.5 leading-tight">
                      <span className="inline-flex items-center gap-1 text-xs opacity-70">
                        {getActivityIcon(activity.type)}
                        {activity.typeLabel}
                      </span>
                      <span className="max-w-[100px] truncate text-xs" title={activity.name}>
                        {activity.name}
                      </span>
                    </div>
                  </th>
                ))}
                <th className={`sticky top-[72px] z-20 min-w-[100px] px-4 py-3 text-center font-medium ${labelText} ${tableHead}`}>Average</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => {
                const average = getStudentAverage(student.id, courses, grades);

                return (
                  <tr key={student.id} className={bodyRow}>
                    <td className={`sticky left-0 z-10 px-5 py-3 ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold shadow-inner ${avatar}`}>
                          {getInitials(student.firstname, student.lastname)}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${titleText}`}>
                            {student.lastname}, {student.firstname}
                          </p>
                          <p className={`text-xs ${mutedText}`}>{student.studentnumber || student.studentid || student.email}</p>
                        </div>
                      </div>
                    </td>

                    {allActivities.map((activity, index) => {
                      const pct = getCellValue(student.id, activity.courseid, activity.id);
                      return (
                        <td key={`${activity.courseid}-${activity.id}`} className={`px-2 py-2 text-center ${dividers.has(index) ? `border-r ${divider}` : ''}`}>
                          {pct !== null ? (
                            <div className={`mx-auto max-w-[90px] rounded-xl px-3 py-2 text-xs font-semibold ${getScoreStyle(pct, isDark)}`}>
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${getScoreDot(pct, isDark)}`} />
                                <span>{Math.round(pct)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className={`text-xs ${mutedText}`}>—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2 text-center">
                      <Badge className={`rounded-full px-3 py-1 text-xs ${getScoreStyle(average, isDark)}`}>{average}%</Badge>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={allActivities.length + 2} className="px-5 py-8 text-center">
                    <p className={mutedText}>No students match your search/filter criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
