@echo off
cd /d "%~dp0"
title Push to GitHub - 3SafeTrade

where git >nul 2>nul
if errorlevel 1 (
  echo git non trovato nel PATH. Apri Git Bash o installa Git.
  goto :end
)

if not exist ".git" (
  echo Cartella .git non trovata. Il bat deve stare nella root del progetto.
  goto :end
)

echo Aggiunta modifiche...
git add -A

git diff --staged --quiet 2>nul
if not errorlevel 1 (
  echo Nessuna modifica da committare.
  goto :end
)

set "MSG=chore: sync"
if not "%~1"=="" set "MSG=%~*"

echo Commit: %MSG%
git commit -m "%MSG%"
if errorlevel 1 (
  echo Errore: git commit fallito.
  goto :end
)

echo Push su origin main...
git push origin main
if errorlevel 1 (
  echo Errore: git push fallito. Controlla rete e credenziali GitHub.
  goto :end
)

echo.
echo Push completato.

:end
echo.
pause
