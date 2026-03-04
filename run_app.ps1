Write-Host "Starting TB Screening System..." -ForegroundColor Cyan

# Get the script's current directory
$RootDir = $PSScriptRoot

# --- Start Backend ---
$BackendScript = Join-Path $RootDir "backend.py"
Write-Host "Launching Backend Server (backend.py)..." -ForegroundColor Green
# Start python in a new window
Start-Process -FilePath "python" -ArgumentList """$BackendScript""" -WorkingDirectory $RootDir

# --- Start Frontend ---
$FrontendDir = Join-Path $RootDir "frontend_lovable\vitri-scan-ui-main"
Write-Host "Launching Frontend (npm run dev)..." -ForegroundColor Green
# Start npm in a new window
# We use cmd /c to ensure npm (which is a batch file on Windows) runs correctly via Start-Process
Start-Process -FilePath "cmd" -ArgumentList "/c npm run dev" -WorkingDirectory $FrontendDir

Write-Host "---------------------------------------------------" -ForegroundColor Yellow
Write-Host "Services are starting in separate windows." -ForegroundColor Yellow
Write-Host "Backend: http://localhost:5000" -ForegroundColor Gray
Write-Host "Frontend: Check the new terminal window for the URL (usually http://localhost:8080)" -ForegroundColor Gray
Write-Host "---------------------------------------------------" -ForegroundColor Yellow
