@echo off
title Lanzador PRODUCCION - Explota Dashboard
color 0B
echo.
echo  ============================================
echo    MODO PRODUCCION - RED ASISTENCIAL
echo  ============================================
echo.

:: Liberar puerto 8080 si esta ocupado
echo [1/3] Liberando puerto 8080 si esta en uso...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Iniciar Backend (que ya incluye el Frontend)
echo [2/3] Iniciando Servidor Unificado (Puerto 8080)...
cd /d "%~dp0"
start "Explota Dashboard - Servidor" cmd /c "python backend.py"

:: Esperar a que este listo
echo [3/3] Esperando que el servidor inicie...
set /a intentos=0
:ESPERA
timeout /t 2 /nobreak >nul
curl -s http://localhost:8080/especialidades >nul 2>&1
if %errorlevel%==0 goto LISTO
set /a intentos+=1
if %intentos% lss 10 (
    echo     ... intentando conectar (%intentos%/10)
    goto ESPERA
)
echo [AVISO] El servidor tarda en responder.

:LISTO
echo.
echo  ============================================
echo    SISTEMA LISTO EN: http://localhost:8080
echo  ============================================
echo.
start http://localhost:8080

exit
