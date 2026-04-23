import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CourseColumn, GradesMap } from '../types';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Calculate average grade across all activities for a student */
export function getStudentAverage(
  studentId: number,
  courses: CourseColumn[],
  grades: GradesMap,
): number {
  let total = 0;
  let count = 0;

  const studentGrades = grades[String(studentId)];
  if (!studentGrades) return 0;

  for (const course of courses) {
    const courseGrades = studentGrades[String(course.id)];
    if (!courseGrades) continue;

    for (const activity of course.activities) {
      const cell = courseGrades[String(activity.id)];
      if (cell && cell.percentage !== null) {
        total += cell.percentage;
        count++;
      }
    }
  }

  return count > 0 ? Math.round(total / count) : 0;
}

/** Get Tailwind classes for score pill background */
export function getScoreStyle(score: number, isDark = true): string {
  if (isDark) {
    if (score < 50) return 'bg-red-500/20 text-red-100 ring-1 ring-red-400/20';
    if (score < 60) return 'bg-amber-400/30 text-amber-50 ring-1 ring-amber-300/20';
    if (score < 75) return 'bg-lime-400/30 text-lime-50 ring-1 ring-lime-300/20';
    return 'bg-emerald-500/30 text-emerald-50 ring-1 ring-emerald-300/20';
  }

  if (score < 50) return 'bg-red-200 text-red-800 ring-1 ring-red-300';
  if (score < 60) return 'bg-amber-200 text-amber-800 ring-1 ring-amber-300';
  if (score < 75) return 'bg-lime-200 text-lime-800 ring-1 ring-lime-300';
  return 'bg-emerald-200 text-emerald-800 ring-1 ring-emerald-300';
}

/** Get Tailwind class for score dot indicator */
export function getScoreDot(score: number, isDark = true): string {
  if (isDark) {
    if (score < 50) return 'bg-red-400';
    if (score < 60) return 'bg-amber-300';
    if (score < 75) return 'bg-lime-300';
    return 'bg-emerald-400';
  }

  if (score < 50) return 'bg-red-500';
  if (score < 60) return 'bg-amber-500';
  if (score < 75) return 'bg-lime-500';
  return 'bg-emerald-500';
}

/** Get initials from first and last name */
export function getInitials(firstname: string, lastname: string): string {
  return (
    (firstname?.[0]?.toUpperCase() ?? '') +
    (lastname?.[0]?.toUpperCase() ?? '')
  );
}

/** Compute which flattened activity column indices are course dividers */
export function getDividerIndices(courses: CourseColumn[]): Set<number> {
  const dividers = new Set<number>();
  let colIndex = -1;

  for (let i = 0; i < courses.length - 1; i++) {
    colIndex += courses[i].activities.length;
    dividers.add(colIndex);
  }

  return dividers;
}

