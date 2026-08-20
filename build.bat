@echo off
setlocal
set "ROOT=%~dp0"
call "%ROOT%download-dependencies.bat" %* || exit /b %errorlevel%
echo Building Wildline Nation desktop renderer...
call npm run build
if errorlevel 1 exit /b %errorlevel%
echo Build complete: %ROOT%dist
if /I "%1"=="/s" exit /b 0
set /p "RUN=Launch the built desktop app now? [Y/N] "
if /I "%RUN%"=="Y" npm start
