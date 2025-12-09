@echo off
cd /d %~dp0

echo ===================================================
echo   Starting AI Smart Apartment System...
echo ===================================================

:: 1. เปิดหน้าต่างใหม่สำหรับ Backend (และไม่ปิดหน้าต่างถ้า Error)
echo [1/2] Launching Backend (FastAPI)...
:: ใช้ call เพื่อเรียก activate ให้สมบูรณ์ก่อนรัน uvicorn
start "Backend Server (FastAPI)" cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: รอ 5 วินาที (เพิ่มเวลาให้ Backend ตื่นตัว)
timeout /t 5 /nobreak >nul

:: 2. เปิดหน้าต่างใหม่สำหรับ Frontend
echo [2/2] Launching Frontend (React)...
start "Frontend Client (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo   System Launch Initiated!
echo   Please check the 'Backend Server' window for any errors.
echo.
echo   Backend API:  http://127.0.0.1:8000/docs
echo   Frontend App: http://localhost:5173
echo ===================================================
pause