@echo off
title ReachInbox Fullstack Launcher
cd /d "%~dp0"

echo ====================================================
echo  Launching ReachInbox Complete System
echo ====================================================

:: 1. Ensure Redis and Postgres are running
powershell -NoProfile -Command ^
  "$redis = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet; " ^
  "$pg = Test-NetConnection -ComputerName 127.0.0.1 -Port 5433 -InformationLevel Quiet; " ^
  "if (-not $redis -or -not $pg) { " ^
  "  Write-Host '[Services] Starting Redis and PostgreSQL background daemon...' -ForegroundColor Cyan; " ^
  "  Start-Process wsl -ArgumentList '-d', 'docker-desktop', '-u', 'root', '-e', '/tmp/keepalive-services.sh' -WindowStyle Hidden; " ^
  "  Start-Sleep -Seconds 3; " ^
  "} else { " ^
  "  Write-Host '[Services] Redis and PostgreSQL are active!' -ForegroundColor Green; " ^
  "}"

:: 2. Start Backend in separate window
start "ReachInbox Backend (Port 5000)" cmd /c "cd /d "%~dp0\backend" && npm run dev"

:: 3. Start Frontend in separate window
start "ReachInbox Frontend (Port 5173)" cmd /c "cd /d "%~dp0\frontend" && npm run dev"

echo.
echo ====================================================
echo  ReachInbox Backend & Frontend are starting!
echo  - Frontend:  http://localhost:5173
echo  - Backend:   http://localhost:5000
echo  - Queues:    http://localhost:5000/admin/queues
echo ====================================================
echo.
timeout /t 5 >nul
start http://localhost:5173
