import { ChevronUp, ChevronDown, Check, X, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import type { CourseColumn } from '../types';

interface CourseControlsProps {
  courses: CourseColumn[];
  courseOrder: number[];
  visibleCourseIds: Set<number>;
  onVisibilityChange: (id: number, visible: boolean) => void;
  onReorder: (newOrder: number[]) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isDark: boolean;
  showFullNames: boolean;
  onToggleFullNames: () => void;
}

export default function CourseControls({
  courses,
  courseOrder,
  visibleCourseIds,
  onVisibilityChange,
  onReorder,
  onSelectAll,
  onDeselectAll,
  isDark,
  showFullNames,
  onToggleFullNames,
}: CourseControlsProps) {
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';
  const titleText = isDark ? 'text-white' : 'text-slate-900';
  const panelClasses = isDark
    ? 'border-white/10 bg-white/5 shadow-2xl shadow-black/20'
    : 'border-slate-200 bg-white shadow-xl shadow-slate-200/70';
  const rowHover = isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50';
  const rowVisible = isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50';
  const checkboxChecked = isDark
    ? 'bg-indigo-500 border-indigo-400 text-white'
    : 'bg-indigo-600 border-indigo-500 text-white';
  const checkboxUnchecked = isDark
    ? 'border-white/20 bg-transparent'
    : 'border-slate-300 bg-white';
  const btnOutline = isDark
    ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
    : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-100';
  const arrowBtn = isDark
    ? 'text-slate-400 hover:text-white hover:bg-white/10'
    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100';
  const arrowDisabled = isDark ? 'text-slate-700 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed';

  // Build ordered list from courseOrder, mapping id → course
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const orderedCourses = courseOrder
    .map((id) => courseMap.get(id))
    .filter((c): c is CourseColumn => c !== undefined);

  const allVisible = courseOrder.length > 0 && courseOrder.every((id) => visibleCourseIds.has(id));
  const noneVisible = courseOrder.length > 0 && courseOrder.every((id) => !visibleCourseIds.has(id));

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const newOrder = [...courseOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onReorder(newOrder);
  }

  function handleMoveDown(index: number) {
    if (index === courseOrder.length - 1) return;
    const newOrder = [...courseOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onReorder(newOrder);
  }

  return (
    <div className={`rounded-[28px] border ${panelClasses} transition-all duration-300`}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className={`text-base font-semibold ${titleText}`}>Course Controls</h3>
            <p className={`text-sm ${mutedText}`}>
              Toggle visibility, reorder columns, and switch name display
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${mutedText}`}>
              {showFullNames ? 'Full names' : 'Shortcodes'}
            </span>
            <button
              type="button"
              onClick={onToggleFullNames}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showFullNames ? 'bg-indigo-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'
              }`}
              aria-label={showFullNames ? 'Show shortcodes' : 'Show full names'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showFullNames ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <Button
              size="sm"
              variant="outline"
              className={`rounded-full ${btnOutline}`}
              onClick={onSelectAll}
              disabled={allVisible}
            >
              <Check className="mr-1 h-3 w-3" />
              Select all
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`rounded-full ${btnOutline}`}
              onClick={onDeselectAll}
              disabled={noneVisible}
            >
              <X className="mr-1 h-3 w-3" />
              Deselect all
            </Button>
          </div>
        </div>

        {/* Course list */}
        <div className="mt-4 space-y-1">
          {orderedCourses.map((course, index) => {
            const isVisible = visibleCourseIds.has(course.id);
            return (
              <div
                key={course.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${rowHover} ${isVisible ? rowVisible : 'opacity-50'}`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => onVisibilityChange(course.id, !isVisible)}
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isVisible ? checkboxChecked : checkboxUnchecked
                  }`}
                  aria-label={isVisible ? `Hide ${course.shortname}` : `Show ${course.shortname}`}
                >
                  {isVisible && <Check className="h-3 w-3" />}
                </button>

                {/* Visibility icon */}
                {isVisible ? (
                  <Eye className={`h-4 w-4 flex-shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                ) : (
                  <EyeOff className={`h-4 w-4 flex-shrink-0 ${mutedText}`} />
                )}

                {/* Course name */}
                <div className="min-w-0 flex-1">
                  <span className={`text-sm font-medium ${titleText}`} title={showFullNames ? course.fullname : undefined}>
                    {showFullNames ? course.fullname : course.shortname}
                  </span>
                  <span className={`ml-2 text-xs ${mutedText}`}>
                    {course.activities.length} activit{course.activities.length !== 1 ? 'ies' : 'y'}
                  </span>
                </div>

                {/* Reorder arrows */}
                <div className="flex flex-shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={`rounded p-0.5 ${index === 0 ? arrowDisabled : arrowBtn}`}
                    aria-label={`Move ${course.shortname} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === courseOrder.length - 1}
                    className={`rounded p-0.5 ${index === courseOrder.length - 1 ? arrowDisabled : arrowBtn}`}
                    aria-label={`Move ${course.shortname} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {orderedCourses.length === 0 && (
          <p className={`py-4 text-center text-sm ${mutedText}`}>No courses available</p>
        )}
      </div>
    </div>
  );
}
