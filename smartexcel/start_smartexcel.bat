@echo off
echo ==========================================
echo Starting SmartExcel Application
echo ==========================================
echo.
echo Starting Python Backend (Port 8000)...
start "SmartExcel Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --port 8000 --reload"

echo Starting React Frontend (Port 5173)...
start "SmartExcel Frontend" cmd /k "npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Once they finish launching, please open your browser to:
echo http://localhost:5173
echo.
pause
