import type { CohortProgressData } from '../types';

export const mockCohortProgress: CohortProgressData = {
  cohortid: 9001,
  cohortname: 'PASMA Demo Cohort',
  students: [
    { id: 101, firstname: 'Kabelo', lastname: 'Fihla', email: 'kabelo@example.com', studentid: 'ST101', studentnumber: '2026101' },
    { id: 102, firstname: 'Vuyelwa', lastname: 'Kalo', email: 'vuyelwa@example.com', studentid: 'ST102', studentnumber: '2026102' },
    { id: 103, firstname: 'Joshua', lastname: 'Roesch', email: 'joshua@example.com', studentid: 'ST103', studentnumber: '2026103' },
    { id: 104, firstname: 'Lerato', lastname: 'Mokoena', email: 'lerato@example.com', studentid: 'ST104', studentnumber: '2026104' },
    { id: 105, firstname: 'Sipho', lastname: 'Dlamini', email: 'sipho@example.com', studentid: 'ST105', studentnumber: '2026105' },
    { id: 106, firstname: 'Naledi', lastname: 'Maseko', email: 'naledi@example.com', studentid: 'ST106', studentnumber: '2026106' },
    { id: 107, firstname: 'Thando', lastname: 'Ncube', email: 'thando@example.com', studentid: 'ST107', studentnumber: '2026107' },
    { id: 108, firstname: 'Ayesha', lastname: 'Patel', email: 'ayesha@example.com', studentid: 'ST108', studentnumber: '2026108' },
  ],
  courses: [
    {
      id: 12,
      shortname: 'FL101',
      fullname: 'FL Studio 101',
      activities: [
        { id: 1201, name: 'H5P Basics', type: 'h5pactivity', typeLabel: 'H5P', grademax: 100 },
        { id: 1202, name: 'Quiz 1', type: 'quiz', typeLabel: 'Quiz', grademax: 100 },
        { id: 1203, name: 'Mini Assignment', type: 'assign', typeLabel: 'Assignment', grademax: 100 },
        { id: 1204, name: 'Forum Reflection', type: 'forum', typeLabel: 'Forum', grademax: 100 },
      ],
    },
    {
      id: 18,
      shortname: 'EQ101',
      fullname: 'EQ & Filters 101',
      activities: [
        { id: 1801, name: 'Lesson Checkpoint', type: 'lesson', typeLabel: 'Lesson', grademax: 100 },
        { id: 1802, name: 'Quiz 2', type: 'quiz', typeLabel: 'Quiz', grademax: 100 },
        { id: 1803, name: 'Practical Task', type: 'assign', typeLabel: 'Assignment', grademax: 100 },
      ],
    },
    {
      id: 25,
      shortname: 'RPR101',
      fullname: 'Reaper 101',
      activities: [
        { id: 2501, name: 'H5P Timeline', type: 'hvp', typeLabel: 'H5P', grademax: 100 },
        { id: 2502, name: 'Routing Quiz', type: 'quiz', typeLabel: 'Quiz', grademax: 100 },
        { id: 2503, name: 'Mix Assignment', type: 'assign', typeLabel: 'Assignment', grademax: 100 },
        { id: 2504, name: 'Peer Forum', type: 'forum', typeLabel: 'Forum', grademax: 100 },
      ],
    },
  ],
  grades: {
    '101': {
      '12': { '1201': { finalgrade: 88, percentage: 88 }, '1202': { finalgrade: 76, percentage: 76 }, '1203': { finalgrade: 65, percentage: 65 }, '1204': { finalgrade: 71, percentage: 71 } },
      '18': { '1801': { finalgrade: 82, percentage: 82 }, '1802': { finalgrade: 91, percentage: 91 }, '1803': { finalgrade: 77, percentage: 77 } },
      '25': { '2501': { finalgrade: 80, percentage: 80 }, '2502': { finalgrade: 85, percentage: 85 }, '2503': { finalgrade: 73, percentage: 73 }, '2504': { finalgrade: 79, percentage: 79 } },
    },
    '102': {
      '12': { '1201': { finalgrade: 45, percentage: 45 }, '1202': { finalgrade: 52, percentage: 52 }, '1203': { finalgrade: 49, percentage: 49 }, '1204': { finalgrade: 55, percentage: 55 } },
      '18': { '1801': { finalgrade: 60, percentage: 60 }, '1802': { finalgrade: 67, percentage: 67 }, '1803': { finalgrade: 58, percentage: 58 } },
      '25': { '2501': { finalgrade: 48, percentage: 48 }, '2502': { finalgrade: 61, percentage: 61 }, '2503': { finalgrade: 50, percentage: 50 }, '2504': { finalgrade: 57, percentage: 57 } },
    },
    '103': {
      '12': { '1201': { finalgrade: 93, percentage: 93 }, '1202': { finalgrade: 85, percentage: 85 }, '1203': { finalgrade: 78, percentage: 78 }, '1204': { finalgrade: 88, percentage: 88 } },
      '18': { '1801': { finalgrade: 90, percentage: 90 }, '1802': { finalgrade: 94, percentage: 94 }, '1803': { finalgrade: 87, percentage: 87 } },
      '25': { '2501': { finalgrade: 92, percentage: 92 }, '2502': { finalgrade: 89, percentage: 89 }, '2503': { finalgrade: 84, percentage: 84 }, '2504': { finalgrade: 90, percentage: 90 } },
    },
    '104': {
      '12': { '1201': { finalgrade: 67, percentage: 67 }, '1202': { finalgrade: 59, percentage: 59 }, '1203': { finalgrade: 62, percentage: 62 }, '1204': { finalgrade: 65, percentage: 65 } },
      '18': { '1801': { finalgrade: 66, percentage: 66 }, '1802': { finalgrade: 71, percentage: 71 }, '1803': { finalgrade: 64, percentage: 64 } },
      '25': { '2501': { finalgrade: 63, percentage: 63 }, '2502': { finalgrade: 68, percentage: 68 }, '2503': { finalgrade: 60, percentage: 60 }, '2504': { finalgrade: 66, percentage: 66 } },
    },
    '105': {
      '12': { '1201': { finalgrade: 81, percentage: 81 }, '1202': { finalgrade: 73, percentage: 73 }, '1203': { finalgrade: 69, percentage: 69 }, '1204': { finalgrade: 75, percentage: 75 } },
      '18': { '1801': { finalgrade: 84, percentage: 84 }, '1802': { finalgrade: 87, percentage: 87 }, '1803': { finalgrade: 79, percentage: 79 } },
      '25': { '2501': { finalgrade: 82, percentage: 82 }, '2502': { finalgrade: 86, percentage: 86 }, '2503': { finalgrade: 80, percentage: 80 }, '2504': { finalgrade: 88, percentage: 88 } },
    },
    '106': {
      '12': { '1201': { finalgrade: 33, percentage: 33 }, '1202': { finalgrade: 41, percentage: 41 }, '1203': { finalgrade: 47, percentage: 47 }, '1204': { finalgrade: 39, percentage: 39 } },
      '18': { '1801': { finalgrade: 48, percentage: 48 }, '1802': { finalgrade: 56, percentage: 56 }, '1803': { finalgrade: 44, percentage: 44 } },
      '25': { '2501': { finalgrade: 35, percentage: 35 }, '2502': { finalgrade: 42, percentage: 42 }, '2503': { finalgrade: 38, percentage: 38 }, '2504': { finalgrade: 46, percentage: 46 } },
    },
    '107': {
      '12': { '1201': { finalgrade: 76, percentage: 76 }, '1202': { finalgrade: 68, percentage: 68 }, '1203': { finalgrade: 74, percentage: 74 }, '1204': { finalgrade: 72, percentage: 72 } },
      '18': { '1801': { finalgrade: 81, percentage: 81 }, '1802': { finalgrade: 89, percentage: 89 }, '1803': { finalgrade: 77, percentage: 77 } },
      '25': { '2501': { finalgrade: 79, percentage: 79 }, '2502': { finalgrade: 83, percentage: 83 }, '2503': { finalgrade: 75, percentage: 75 }, '2504': { finalgrade: 84, percentage: 84 } },
    },
    '108': {
      '12': { '1201': { finalgrade: 58, percentage: 58 }, '1202': { finalgrade: 63, percentage: 63 }, '1203': { finalgrade: 50, percentage: 50 }, '1204': { finalgrade: 61, percentage: 61 } },
      '18': { '1801': { finalgrade: 65, percentage: 65 }, '1802': { finalgrade: 60, percentage: 60 }, '1803': { finalgrade: 57, percentage: 57 } },
      '25': { '2501': { finalgrade: 59, percentage: 59 }, '2502': { finalgrade: 62, percentage: 62 }, '2503': { finalgrade: 54, percentage: 54 }, '2504': { finalgrade: 60, percentage: 60 } },
    },
  },
};
