@echo off
REM Crea cartella logs se non esiste
if not exist "logs" mkdir logs

REM Avvia PowerShell e salva tutto l'output in un file di log
REM PowerShell gestirà internamente il logging
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0manage_dev.ps1"

REM Mostra il percorso della cartella log
echo.
echo ========================================
echo Log salvati in: logs\
echo ========================================
pause
