#!/bin/bash
set -e

echo "==================================="
echo "Moodle Modern Gradebook Setup"
echo "==================================="

# Check if we're in the right directory
if [ ! -f "app_spec.txt" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Frontend setup
echo ""
echo "Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Frontend dependencies already installed"
fi

# Create .env from .env.example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit frontend/.env and set your VITE_MOODLE_TOKEN"
fi

cd ..

# Backend setup
echo ""
echo "Backend setup notes:"
echo "  - The backend is a Moodle local plugin"
echo "  - To install: Copy the 'backend' directory to your Moodle installation"
echo "  - Target location: /path/to/moodle/local/gradebookapi/"
echo "  - Then visit Site administration > Notifications to complete installation"
echo "  - Set the API token in plugin settings after installation"

echo ""
echo "==================================="
echo "Setup complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "  1. Edit frontend/.env with your Moodle server details"
echo "  2. Install the backend plugin to your Moodle instance"
echo "  3. Run 'cd frontend && npm run dev' to start development"
echo ""
