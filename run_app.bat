@echo off
echo Starting TB Screening System...

start cmd /k "python backend.py"
start cmd /k "cd frontend_lovable\vitri-scan-ui-main && npm run dev"

echo ---------------------------------------------------
echo Backend and Frontend are starting in new windows.
echo Please wait a few seconds for them to initialize.
echo ---------------------------------------------------
pause
