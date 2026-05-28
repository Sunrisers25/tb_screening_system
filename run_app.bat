@echo off
echo Starting TB Screening System...

start cmd /k "cd backend && python backend.py"
start cmd /k "cd frontend && npm run dev"

echo ---------------------------------------------------
echo Backend and Frontend are starting in new windows.
echo Please wait a few seconds for them to initialize.
echo ---------------------------------------------------
pause
