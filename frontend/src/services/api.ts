import axios, { AxiosInstance } from 'axios';
import type {
  Cohort,
  Student,
  StudentGradeData,
  CohortGradeData,
  CohortWithCount,
  CourseColumn,
  CohortProgressData,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const MOODLE_TOKEN = import.meta.env.VITE_MOODLE_TOKEN || '';

class GradebookAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${MOODLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getCohorts(courseId: number): Promise<Cohort[]> {
    const response = await this.client.get<Cohort[]>('/cohorts.php', {
      params: { courseid: courseId },
    });
    return response.data;
  }

  async getStudents(courseId: number, cohortId: number): Promise<Student[]> {
    const response = await this.client.get<Student[]>('/students.php', {
      params: { courseid: courseId, cohortid: cohortId },
    });
    return response.data;
  }

  async getStudentGrades(courseId: number, userId: number): Promise<StudentGradeData> {
    const response = await this.client.get<StudentGradeData>('/student_grades.php', {
      params: { courseid: courseId, userid: userId },
    });
    return response.data;
  }

  async getCohortGrades(courseId: number, cohortId: number): Promise<CohortGradeData> {
    const response = await this.client.get<CohortGradeData>('/cohort_grades.php', {
      params: { courseid: courseId, cohortid: cohortId },
    });
    return response.data;
  }

  /** Get all cohorts (no course filter) */
  async getAllCohorts(): Promise<CohortWithCount[]> {
    const response = await this.client.get<CohortWithCount[]>('/all_cohorts.php');
    return response.data;
  }

  /** Get all courses a cohort is enrolled in */
  async getCohortCourses(cohortId: number): Promise<CourseColumn[]> {
    const response = await this.client.get<CourseColumn[]>('/cohort_courses.php', {
      params: { cohortid: cohortId },
    });
    return response.data;
  }

  /** Get bulk progress data for entire cohort (all students × all courses × all grades) */
  async getCohortProgress(cohortId: number): Promise<CohortProgressData> {
    const response = await this.client.get<CohortProgressData>('/cohort_progress.php', {
      params: { cohortid: cohortId },
    });
    return response.data;
  }
}

export const gradebookAPI = new GradebookAPI();
