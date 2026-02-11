@echo off
cd /d "%~dp0"

echo Aggiunta modifiche...
git add -A
if errorlevel 1 (
  echo Errore: git add fallito
  pause
  exit /b 1
)

git status --short | findstr /r "." >nul 2>&1
if errorlevel 1 (
  echo Nessuna modifica da committare.
  pause
  exit /b 0
)

set MSG=chore: sync
if not "%~1"=="" set MSG=%~*

echo Commit: %MSG%
git commit -m "%MSG%"
if errorlevel 1 (
  echo Errore: git commit fallito
  pause
  exit /b 1
)

echo Push su origin main...
git push origin main
if errorlevel 1 (
  echo Errore: git push fallito
  pause
  exit /b 1
)

echo.
echo Push completato.
pause
