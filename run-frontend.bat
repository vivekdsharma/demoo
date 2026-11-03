@echo off
title ReachInbox Frontend Dashboard
cd /d "%~dp0\frontend"
echo ====================================================
echo Starting ReachInbox Frontend Dashboard (Port 5173)...
echo ====================================================
npm run dev
pause
