@echo off
title Lanzador - Explota Dashboard
color 0A
echo.
echo  ============================================
echo    SISTEMA DE GESTION - RED ASISTENCIAL
echo  ============================================
echo.

:: Matar procesos previos en el puerto 8080 (backend viejo)
echo [1/4] Liberando puerto 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Iniciar Backend en su propia ventana
echo [2/4] Iniciando Backend (FastAPI)...
cd /d "%~dp0"
start "Backend - FastAPI :8080" cmd /k "python backend.py"

:: Esperar a que el backend este listo (intenta conectar hasta 20 segundos)
echo [3/4] Esperando que el servidor este listo...
set /a intentos=0
:ESPERA
timeout /t 2 /nobreak >nul
curl -s http://localhost:8080/especialidades >nul 2>&1
if %errorlevel%==0 goto LISTO
set /a intentos+=1
if %intentos% lss 10 (
    echo     ... esperando backend (%intentos%/10)
    goto ESPERA
)
echo [AVISO] Backend tardo mas de lo esperado, continuando...

:LISTO
echo [4/4] Iniciando Frontend (Vite)...
cd /d "%~dp0app"
start "Frontend - React :5173" cmd /k "npm run dev"

:: Esperar que Vite compile
timeout /t 4 /nobreak >nul

:: Abrir navegador
echo.
echo  ============================================
echo    Backend  : http://localhost:8080
echo    Frontend : http://localhost:5173
echo  ============================================
echo.
start http://localhost:5173

exit
