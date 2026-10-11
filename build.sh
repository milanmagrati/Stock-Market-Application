#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "--- 1. Building Frontend React Assets ---"
cd frontend
npm install
npm run build
cd ..

echo "--- 2. Installing Python Backend Dependencies ---"
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt

echo "--- 3. Synchronizing Database Schema & Native Partitions on Supabase ---"
export PYTHONPATH="backend"
python backend/init_db.py || echo "Notice: Database sync will complete during application startup."


echo "--- Build Completed Successfully ---"
