@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install it from the canonical Node.js distribution, then rerun this script.
  exit /b 1
)
echo Installing locked project dependencies...
call npm install
if errorlevel 1 exit /b %errorlevel%
echo Dependencies ready.
