@echo off
title ReachInbox Backend Server
cd /d "%~dp0"

echo ====================================================
echo  Checking Redis and PostgreSQL Services...
echo ====================================================

powershell -NoProfile -Command ^
  "$redis = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -InformationLevel Quiet; " ^
  "$pg = Test-NetConnection -ComputerName 127.0.0.1 -Port 5433 -InformationLevel Quiet; " ^
  "if (-not $redis -or -not $pg) { " ^
  "  Write-Host '[Services] Starting Redis and PostgreSQL background daemon...' -ForegroundColor Cyan; " ^
  "  Start-Process wsl -ArgumentList '-d', 'docker-desktop', '-u', 'root', '-e', '/tmp/keepalive-services.sh' -WindowStyle Hidden; " ^
  "  Start-Sleep -Seconds 3; " ^
  "} else { " ^
  "  Write-Host '[Services] Redis and PostgreSQL are already active!' -ForegroundColor Green; " ^
  "}"

echo ====================================================
echo  Starting ReachInbox Backend Server (Port 5000)...
echo ====================================================
cd /d "%~dp0\backend"
npm run dev
pause
