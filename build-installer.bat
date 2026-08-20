@echo off
setlocal
set "ROOT=%~dp0"
call "%ROOT%download-dependencies.bat" /s || exit /b %errorlevel%
echo Building unsigned Squirrel.Windows installer...
call npm run dist
if errorlevel 1 exit /b %errorlevel%
echo Unsigned installer artifacts are in %ROOT%dist
