#!/bin/bash
# ============================================================
# Student Progress Dashboard — Start / Stop / Status
# ============================================================
# Usage:
#   ./dashboard.sh start   — Start the dev server (port 3000)
#   ./dashboard.sh stop    — Stop the dev server
#   ./dashboard.sh status  — Check if running
#   ./dashboard.sh build   — Production build
#   ./dashboard.sh deploy  — Deploy backend to Moodle server
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PID_FILE="$FRONTEND_DIR/.dev-server.pid"
LOG_FILE="$FRONTEND_DIR/.dev-server.log"
PORT=3000

# Server details for deploy
MOODLE_HOST="102.39.248.227"
MOODLE_USER="hd"
MOODLE_PASS="0828021635Ab?!"
MOODLE_PATH="/var/www/html/pasmoodle/local/gradebookapi"

start_server() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "⚡ Server already running (PID $(cat "$PID_FILE"))"
        echo "   → http://localhost:$PORT"
        return 0
    fi

    echo "🚀 Starting Student Progress Dashboard..."
    cd "$FRONTEND_DIR" || exit 1

    # Start dev server in background
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"

    # Wait for server to be ready
    for i in $(seq 1 15); do
        if curl -s -o /dev/null "http://localhost:$PORT" 2>/dev/null; then
            echo "✅ Server running at http://localhost:$PORT (PID $(cat "$PID_FILE"))"
            echo "   📊 Open in browser: http://localhost:$PORT"
            return 0
        fi
        sleep 1
    done

    echo "⏳ Server started (PID $(cat "$PID_FILE")) — may still be initializing"
    echo "   → http://localhost:$PORT"
}

stop_server() {
    if [ ! -f "$PID_FILE" ]; then
        echo "ℹ️  No PID file found. Checking for orphaned processes..."
        PIDS=$(lsof -ti :$PORT 2>/dev/null)
        if [ -n "$PIDS" ]; then
            echo "🛑 Killing processes on port $PORT: $PIDS"
            kill $PIDS 2>/dev/null
            sleep 1
            kill -9 $PIDS 2>/dev/null
            echo "✅ Stopped"
        else
            echo "ℹ️  Server is not running"
        fi
        return 0
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "🛑 Stopping server (PID $PID)..."
        kill "$PID" 2>/dev/null
        sleep 2
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            kill -9 "$PID" 2>/dev/null
        fi
        echo "✅ Server stopped"
    else
        echo "ℹ️  Server was not running (stale PID file)"
    fi

    rm -f "$PID_FILE"

    # Clean up any remaining processes on the port
    PIDS=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PIDS" ]; then
        kill $PIDS 2>/dev/null
    fi
}

server_status() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "✅ Server is running (PID $(cat "$PID_FILE"))"
        echo "   → http://localhost:$PORT"
    else
        echo "⭕ Server is not running"
        [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    fi
}

build_production() {
    echo "🔨 Building production bundle..."
    cd "$FRONTEND_DIR" || exit 1
    npx tsc --noEmit && npm run build
    if [ $? -eq 0 ]; then
        echo "✅ Production build complete → frontend/dist/"
    else
        echo "❌ Build failed"
        exit 1
    fi
}

deploy_backend() {
    echo "🚢 Deploying backend to Moodle server..."

    BACKEND_DIR="$SCRIPT_DIR/backend"
    FILES="all_cohorts.php cohort_courses.php cohort_progress.php lib.php"

    # Upload to /tmp
    for f in $FILES; do
        echo "   📤 Uploading $f..."
        sshpass -p "$MOODLE_PASS" scp -o StrictHostKeyChecking=no \
            "$BACKEND_DIR/$f" "$MOODLE_USER@$MOODLE_HOST:/tmp/$f" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "   ❌ Failed to upload $f"
            exit 1
        fi
    done

    # Move to web directory with sudo
    echo "   📦 Installing to $MOODLE_PATH..."
    sshpass -p "$MOODLE_PASS" ssh -o StrictHostKeyChecking=no "$MOODLE_USER@$MOODLE_HOST" \
        "echo '$MOODLE_PASS' | sudo -S bash -c 'cp /tmp/{all_cohorts.php,cohort_courses.php,cohort_progress.php,lib.php} $MOODLE_PATH/ && chown www-data:www-data $MOODLE_PATH/all_cohorts.php $MOODLE_PATH/cohort_courses.php $MOODLE_PATH/cohort_progress.php $MOODLE_PATH/lib.php'" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo "✅ Backend deployed to $MOODLE_HOST"
    else
        echo "❌ Deploy failed"
        exit 1
    fi

    # Verify
    echo "   🔍 Verifying endpoints..."
    TOKEN="pasma-gradebook-2026-secret-token"
    BASE="http://discoverpasma.mynetgear.com/pasmoodle/local/gradebookapi"

    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE/all_cohorts.php" 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
        echo "   ✅ all_cohorts.php → 200 OK"
    else
        echo "   ⚠️  all_cohorts.php → HTTP $STATUS"
    fi
}

# ============================================================
# Main
# ============================================================
case "${1:-}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    status)
        server_status
        ;;
    build)
        build_production
        ;;
    deploy)
        deploy_backend
        ;;
    restart)
        stop_server
        sleep 1
        start_server
        ;;
    *)
        echo "Student Progress Dashboard"
        echo "=========================="
        echo ""
        echo "Usage: $0 {start|stop|status|restart|build|deploy}"
        echo ""
        echo "  start    Start dev server on port $PORT"
        echo "  stop     Stop the dev server"
        echo "  status   Check if server is running"
        echo "  restart  Stop + start"
        echo "  build    Production build to dist/"
        echo "  deploy   Deploy backend PHP to Moodle server"
        echo ""
        server_status
        ;;
esac
