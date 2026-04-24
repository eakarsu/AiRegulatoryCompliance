#!/bin/bash

# ========================================
# AI Regulatory Compliance Application
# Startup Script with Hot Reload
# ========================================
#
# This script will:
# 1. Clean up used ports (3000, 5001)
# 2. Check PostgreSQL and create database if needed
# 3. Install all dependencies
# 4. Seed the database with 15+ items per feature
# 5. Start backend with nodemon (hot-reload)
# 6. Start frontend with React HMR (hot-reload)
#
# All 7 AI Features:
# - AI GDPR Scanner
# - AI Policy Generator
# - AI Audit Scheduler
# - AI Violation Predictor
# - AI Training Tracker
# - AI Privacy Policy Generator
# - AI Compliance Checker

set -e

echo "=========================================="
echo "  AI Regulatory Compliance Manager"
echo "  Starting Application with Hot Reload..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=5001
FRONTEND_PORT=3000
DB_NAME="regulatory_compliance"
DB_USER="postgres"
DB_PASSWORD="postgres123"
DB_HOST="localhost"
DB_PORT=5432

# Function to clean up ports
cleanup_ports() {
    echo -e "${YELLOW}Cleaning up ports...${NC}"

    # Kill processes on backend port
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Killing process on port $BACKEND_PORT..."
        kill -9 $(lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t) 2>/dev/null || true
    fi

    # Kill processes on frontend port
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Killing process on port $FRONTEND_PORT..."
        kill -9 $(lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t) 2>/dev/null || true
    fi

    # Also check for any node processes that might be stuck
    pkill -f "node.*3000" 2>/dev/null || true
    pkill -f "node.*5001" 2>/dev/null || true

    sleep 2
    echo -e "${GREEN}Ports cleaned up!${NC}"
}

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL...${NC}"

    if ! command -v psql &> /dev/null; then
        echo -e "${RED}PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
        echo "On macOS: brew install postgresql@15 && brew services start postgresql@15"
        echo "On Ubuntu: sudo apt-get install postgresql postgresql-contrib"
        exit 1
    fi

    # Try to connect to PostgreSQL
    if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}PostgreSQL is not running. Attempting to start...${NC}"

        # Try to start PostgreSQL on macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew services start postgresql@15 2>/dev/null || brew services start postgresql 2>/dev/null || true
        fi

        # Wait for PostgreSQL to start
        sleep 3

        if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
            echo -e "${RED}Could not start PostgreSQL. Please start it manually.${NC}"
            exit 1
        fi
    fi

    echo -e "${GREEN}PostgreSQL is running!${NC}"
}

# Function to create database
create_database() {
    echo -e "${YELLOW}Creating database...${NC}"

    # Check if database exists
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo -e "${GREEN}Database '$DB_NAME' already exists.${NC}"
    else
        echo "Creating database '$DB_NAME'..."
        createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || \
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || \
        echo "Database may already exist or user doesn't have permissions"
    fi
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"

    # Backend
    echo "Installing backend dependencies..."
    cd backend
    npm install --silent 2>/dev/null || npm install
    cd ..

    # Frontend
    echo "Installing frontend dependencies..."
    cd frontend
    npm install --silent 2>/dev/null || npm install
    cd ..

    echo -e "${GREEN}Dependencies installed!${NC}"
}

# Function to seed database
seed_database() {
    echo -e "${YELLOW}Seeding database with sample data...${NC}"
    echo -e "${BLUE}Seeding 15+ items for each feature:${NC}"
    echo "  - Users, Regulations, Compliance Checks"
    echo "  - Policies, Risk Assessments, Documents"
    echo "  - Alerts, Reports, Training Records"
    echo "  - Incidents, Vendors, Control Frameworks"
    echo "  - GDPR Scans, Audit Schedules, Violation Predictions"
    echo "  - Training Progress, Privacy Policies, Legal Compliance Checks"

    cd backend
    npm run seed
    cd ..

    echo -e "${GREEN}Database seeded successfully!${NC}"
}

# Function to start backend with hot reload (nodemon)
start_backend() {
    echo -e "${YELLOW}Starting backend server with hot reload (nodemon)...${NC}"
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    echo -e "${GREEN}Backend started on port $BACKEND_PORT (PID: $BACKEND_PID)${NC}"
}

# Function to start frontend with hot reload (React HMR)
start_frontend() {
    echo -e "${YELLOW}Starting frontend server with hot reload (React HMR)...${NC}"
    cd frontend
    BROWSER=none npm start &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}Frontend started on port $FRONTEND_PORT (PID: $FRONTEND_PID)${NC}"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Application stopped.${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    # Change to script directory
    cd "$(dirname "$0")"

    # Clean up ports
    cleanup_ports

    # Check PostgreSQL
    check_postgres

    # Create database
    create_database

    # Install dependencies
    install_dependencies

    # Seed database
    seed_database

    # Start servers
    start_backend
    sleep 3
    start_frontend

    echo ""
    echo "=========================================="
    echo -e "${GREEN}Application is running with HOT RELOAD!${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  Frontend: http://localhost:$FRONTEND_PORT"
    echo "  Backend:  http://localhost:$BACKEND_PORT"
    echo ""
    echo -e "${PURPLE}Login Credentials:${NC}"
    echo "  Email:    admin@compliance.com"
    echo "  Password: password123"
    echo ""
    echo -e "${YELLOW}Hot Reload Enabled:${NC}"
    echo "  - Backend:  nodemon watches for .js file changes"
    echo "  - Frontend: React HMR auto-updates on save"
    echo ""
    echo -e "${GREEN}AI Features Available:${NC}"
    echo "  1. AI GDPR Scanner        - /gdpr-scanner"
    echo "  2. AI Policy Generator    - /policies"
    echo "  3. AI Audit Scheduler     - /audit-scheduler"
    echo "  4. AI Violation Predictor - /violation-predictor"
    echo "  5. AI Training Tracker    - /training-tracker"
    echo "  6. AI Privacy Policy Gen  - /privacy-policy-generator"
    echo "  7. AI Compliance Checker  - /compliance-checker"
    echo ""
    echo "Press Ctrl+C to stop the application"
    echo ""

    # Wait for both processes
    wait $FRONTEND_PID $BACKEND_PID
}

# Run main function
main
