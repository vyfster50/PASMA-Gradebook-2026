// API Response Types

export interface Cohort {
  id: number;
  name: string;
  description?: string;
  idnumber?: string;
}

export interface Student {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  studentid?: string;
  studentnumber?: string;
}

export interface GradeItem {
  id: number;
  itemname: string;
  itemtype: string;
  itemmodule?: string;
  grademax: number;
  grademin: number;
  gradepass?: number;
  categoryid?: number;
}

export interface Grade {
  itemid: number;
  userid: number;
  finalgrade?: number;
  rawgrade?: number;
  percentageformatted?: string;
  feedback?: string;
  timecreated?: number;
  timemodified?: number;
}

export interface StudentGradeData {
  student: Student;
  courseid: number;
  coursename?: string;
  items: GradeItem[];
  grades: Grade[];
  coursetotal?: {
    finalgrade?: number;
    grademax: number;
    percentageformatted?: string;
  };
}

export interface CohortGradeStudent {
  student: Student;
  items: GradeItem[];
  grades: Grade[];
  coursetotal?: {
    finalgrade?: number;
    grademax: number;
    gradepass?: number;
    percentageformatted?: string;
  };
}

export interface CohortGradeData {
  courseid: number;
  coursename: string;
  cohortid: number;
  cohortname: string;
  students: CohortGradeStudent[];
}

export interface ApiError {
  error: string;
  message?: string;
  code?: string;
}

// ============================================================
// NEW TYPES — Student Progress Dashboard
// ============================================================

/** Moodle activity module types */
export type ActivityType =
  | 'h5pactivity' | 'hvp' | 'lesson' | 'assign'
  | 'quiz' | 'forum' | 'workshop' | 'scorm'
  | 'manual' | string;

/** A single gradable activity within a course */
export interface CourseActivity {
  id: number;
  name: string;
  type: ActivityType;
  typeLabel: string;
  grademax: number;
}

/** A course with its activities (used as column group) */
export interface CourseColumn {
  id: number;
  shortname: string;
  fullname: string;
  activities: CourseActivity[];
}

/** A single grade cell in the matrix */
export interface GradeCell {
  finalgrade: number | null;
  percentage: number | null;
}

/** Nested grades map: grades[userId][courseId][itemId] → GradeCell */
export type GradesMap = Record<string, Record<string, Record<string, GradeCell>>>;

/** Cohort with member count (from all_cohorts endpoint) */
export interface CohortWithCount extends Cohort {
  membercount: number;
}

/** Full response from cohort_progress.php */
export interface CohortProgressData {
  cohortid: number;
  cohortname: string;
  students: Student[];
  courses: CourseColumn[];
  grades: GradesMap;
}

/** Dashboard statistics computed client-side */
export interface DashboardStats {
  overall: number;
  atRisk: number;
  top: number;
  watchlist: number;
  total: number;
}
