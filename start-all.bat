@echo off
title J.A.R.V.I.S. Launcher
echo ==============================================
echo       LAUNCHING J.A.R.V.I.S. SYSTEMS
echo ==============================================
echo Starting Backend Server on port 5000...
start "J.A.R.V.I.S. Backend" cmd /k "cd /d %~dp0backend && node server.js"

echo Starting Frontend UI on port 3000...
cd /d %~dp0frontend
npm start
