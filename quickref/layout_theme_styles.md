# PASMA Gradebook 2026 — Layout, Theme & Styles Quick Reference

> Tag this file + the relevant component file(s) when asking an LLM to adjust the GUI.

---

## File Map by Concern

| Concern | File(s) to tag |
|---|---|
| **Score colours / grade pills** | `frontend/src/lib/utils.ts` + `ProgressMatrix.tsx` |
| **Main grade table layout** | `frontend/src/components/ProgressMatrix.tsx` |
| **Header / search / export button** | `frontend/src/components/DashboardHeader.tsx` |
| **Stats cards (at-risk / top / watchlist)** | `frontend/src/components/StatsCards.tsx` |
| **Cohort picker dropdown** | `frontend/src/components/CohortSelector.tsx` + `CohortDropdown.tsx` |
| **Cohort grid view** | `frontend/src/components/CohortGrid.tsx` |
| **Student detail drill-down** | `frontend/src/components/StudentGradeDetail.tsx` |
| **Student search** | `frontend/src/components/StudentSearch.tsx` |
| **Dark / light theme toggle logic** | `frontend/src/components/ProgressDashboard.tsx` |
| **Global CSS / Tailwind base styles** | `frontend/src/index.css` |
| **Root wrapper / theme provider** | `frontend/src/App.tsx` |
| **Tailwind config (colours, spacing, screens)** | `frontend/tailwind.config.js` |
| **Primitive: Button** | `frontend/src/components/ui/button.tsx` |
| **Primitive: Card** | `frontend/src/components/ui/card.tsx` |
| **Primitive: Badge** | `frontend/src/components/ui/badge.tsx` |
| **Primitive: Input** | `frontend/src/components/ui/input.tsx` |
| **Primitive: Progress bar** | `frontend/src/components/ui/progress.tsx` |
| **TypeScript types** | `frontend/src/types/index.ts` |
| **API service** | `frontend/src/services/api.ts` |

---

## Score Colour System (`utils.ts`)

Colours are applied by `getScoreStyle(score, isDark)` and dot by `getScoreDot(score, isDark)`.

| Range | Label | Dark pill | Light pill | Dot (dark) | Dot (light) |
|---|---|---|---|---|---|
| `< 50` | At Risk | `bg-red-500/20 text-red-100` | `bg-red-200 text-red-800` | `bg-red-400` | `bg-red-500` |
| `50–59` | Watchlist | `bg-amber-400/30 text-amber-50` | `bg-amber-200 text-amber-800` | `bg-amber-300` | `bg-amber-500` |
| `60–74` | Doing Well | `bg-lime-400/30 text-lime-50` | `bg-lime-200 text-lime-800` | `bg-lime-300` | `bg-lime-500` |
| `≥ 75` | Top | `bg-emerald-500/30 text-emerald-50` | `bg-emerald-200 text-emerald-800` | `bg-emerald-400` | `bg-emerald-500` |

---

## Theme System (`ProgressDashboard.tsx`)

Theme is stored in `localStorage` under key `progress_dash_theme` (`'dark'` or `'light'`).  
`isDark` boolean is passed as a prop to every child component.

### Key class variables set in `ProgressDashboard.tsx`
```ts
const pageClasses = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900';
const mutedText   = isDark ? 'text-slate-400'              : 'text-slate-600';
```

### Key class variables set in `ProgressMatrix.tsx`
```ts
const tableHead  = isDark ? 'bg-slate-900/95'   : 'bg-slate-100/95';
const courseBand = isDark ? 'bg-white/[0.06]'   : 'bg-slate-50';
const bodyRow    = isDark ? 'border-b border-white/5 hover:bg-white/[0.03]'
                          : 'border-b border-slate-200 hover:bg-slate-50';
const avatar     = isDark ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200'
                          : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700';
const panelClasses = isDark
  ? 'border-white/10 bg-white/5 shadow-2xl shadow-black/20'
  : 'border-slate-200 bg-white shadow-xl shadow-slate-200/70';
```

---

## Layout Structure

```
ProgressDashboard (page wrapper, max-w-[1800px])
├── DashboardHeader
│   ├── CohortSelector / CohortDropdown
│   ├── StudentSearch
│   └── Export CSV button + theme toggle
├── StatsCards  (4 stat tiles)
├── ProgressMatrix  (scrollable table)
│   ├── thead row 1 — course group headers (colSpan)
│   ├── thead row 2 — activity column headers
│   └── tbody — one <tr> per student
│       ├── sticky student name/avatar cell
│       ├── one <td> per activity (score pill or —)
│       └── average badge cell
└── Legend + total count footer
```

---

## Tailwind Config Notes (`tailwind.config.js`)

- Content paths scan `./src/**/*.{ts,tsx}`
- No custom theme extensions currently — uses Tailwind defaults
- PostCSS config: `tailwind.config.js` + `postcss.config.js`

---

## Deploy Reminder

Backend PHP changes → run from project root:
```bash
cd "PASMA Gradebook 2026" && ./dashboard.sh deploy
```

Frontend changes (dev) → already live via Vite HMR on `http://localhost:3000`.  
Frontend production build:
```bash
cd "PASMA Gradebook 2026" && ./dashboard.sh build
```
