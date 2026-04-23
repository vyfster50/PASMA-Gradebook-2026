# Moodle Modern Gradebook

A modern, responsive gradebook web application for Moodle with a clean React frontend and PHP backend plugin.

## Overview

This application provides a modern interface for viewing Moodle grades with:
- Cohort-based student selection
- Clean Material UI design
- Token-based API authentication
- Compliance with Moodle grade visibility rules

## Project Structure

```
.
├── frontend/           # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── services/   # API service layer
│   │   ├── types/      # TypeScript type definitions
│   │   └── hooks/      # Custom React hooks
│   └── package.json
│
├── backend/            # Moodle local plugin (local_gradebookapi)
│   ├── cohorts.php     # GET /cohorts.php?courseid={id}
│   ├── students.php    # GET /students.php?courseid={id}&cohortid={id}
│   ├── student_grades.php # GET /student_grades.php?courseid={id}&userid={id}
│   ├── lib.php         # Helper functions
│   ├── version.php     # Plugin metadata
│   └── db/
│       └── access.php  # Capability definitions
│
├── feature_list.json   # Feature tracking for autonomous development
├── claude-progress.txt # Development progress log
└── init.sh            # Setup script
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- Moodle 3.9+ instance on local network
- SSH access to Moodle server (for plugin installation)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd moodle-modern-gradebook
   ```

2. **Run the setup script**
   ```bash
   chmod +x init.sh
   ./init.sh
   ```

3. **Configure environment variables**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env and set:
   # - VITE_API_BASE_URL (your Moodle server URL)
   # - VITE_MOODLE_TOKEN (API token from plugin settings)
   # - VITE_DEFAULT_COURSE_ID (optional: default course)
   ```

4. **Install the backend plugin**
   ```bash
   # Copy backend to Moodle installation
   scp -r backend/ user@192.168.1.9:/path/to/moodle/local/gradebookapi/

   # Or manually copy the backend directory to:
   # /path/to/moodle/local/gradebookapi/
   ```

5. **Configure the plugin in Moodle**
   - Visit: Site administration > Notifications
   - Complete the plugin installation
   - Go to: Site administration > Plugins > Local plugins > Gradebook API
   - Set a secure API token (generate with: `openssl rand -hex 32`)

6. **Start the development server**
   ```bash
   cd frontend
   npm run dev
   ```

   The app will be available at http://localhost:3000

## API Endpoints

All endpoints require Bearer token authentication:

```bash
Authorization: Bearer YOUR_TOKEN_HERE
```

### GET /cohorts.php

Get cohorts for a course.

**Parameters:**
- `courseid` (int) - Course ID

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://192.168.1.9/local/gradebookapi/cohorts.php?courseid=12"
```

### GET /students.php

Get students in a cohort who are enrolled in a course.

**Parameters:**
- `courseid` (int) - Course ID
- `cohortid` (int) - Cohort ID

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://192.168.1.9/local/gradebookapi/students.php?courseid=12&cohortid=7"
```

### GET /student_grades.php

Get grade breakdown for a student (excludes hidden items/grades).

**Parameters:**
- `courseid` (int) - Course ID
- `userid` (int) - User ID

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://192.168.1.9/local/gradebookapi/student_grades.php?courseid=12&userid=123"
```

## Features

### Core Features ✅
- [x] Project structure and build system
- [x] Backend API endpoints with authentication
- [x] TypeScript type definitions
- [x] API service layer
- [ ] Cohort selection UI
- [ ] Student search UI
- [ ] Grade detail view UI
- [ ] Visibility compliance (hidden items excluded)

### Bonus Features (Planned)
- [ ] Cohort gradebook grid (MUI DataGrid)
- [ ] CSV export
- [ ] Response caching
- [ ] Offline-friendly state persistence
- [ ] Audit logging

## Development

### Frontend Development

```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Backend Development

The backend is a Moodle local plugin following Moodle coding standards.

Edit files in `backend/` and sync to your Moodle instance:

```bash
rsync -avz backend/ user@192.168.1.9:/path/to/moodle/local/gradebookapi/
```

## Security Notes

- **Never commit tokens or credentials** to version control
- Use environment variables for sensitive configuration
- The backend validates tokens using constant-time comparison
- All API endpoints check authentication before processing
- Grade visibility rules are enforced server-side

## Custom Profile Fields

The plugin expects these Moodle custom profile fields:
- `studentid` - Student ID number
- `studentnumber` - Student Number

Configure these in Moodle: Site administration > Users > User profile fields

## Troubleshooting

### CORS Issues
The Vite dev server includes a proxy configuration for development. If you encounter CORS issues:
- Check `frontend/vite.config.ts` proxy settings
- Verify your Moodle server URL
- Consider serving the React app from the Moodle server in production

### Authentication Errors
- Ensure the API token is set in both:
  - Moodle plugin settings (Site admin > Plugins > Local plugins)
  - Frontend `.env` file (`VITE_MOODLE_TOKEN`)
- Tokens must match exactly

### No Cohorts/Students Returned
- Verify users are both in the cohort AND enrolled in the course
- Check that enrolments are active (not suspended)
- Ensure the course ID is correct

## License

This project follows Moodle's GPLv3 license.

## Contributing

This is an autonomous development project. See `feature_list.json` for the feature roadmap.

---

**Generated with Claude Code**
