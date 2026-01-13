@echo off
REM Test di Sicurezza e Stabilità - SafeTrade
REM Esegue tutti i test di sicurezza e stabilità

echo ================================================================
echo    SAFETRADE - TEST DI SICUREZZA E STABILITA
echo ================================================================
echo.

REM Verifica che il server sia in esecuzione
echo [1/3] Verificando che il server sia in esecuzione...
curl -s http://localhost:3000/api/listings >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERRORE: Il server non e' in esecuzione!
    echo.
    echo Avvia il server con: npm run dev
    echo.
    pause
    exit /b 1
)
echo OK: Server in esecuzione
echo.

REM Esegui i test
echo [2/3] Eseguendo test di sicurezza e stabilita...
echo.
call npm run test:all
if errorlevel 1 (
    echo.
    echo ERRORE: Alcuni test sono falliti!
    echo Controlla il report in TEST_SECURITY_REPORT.md
    echo.
    pause
    exit /b 1
)
echo.

REM Mostra report
echo [3/3] Test completati!
echo.
echo Report generato: TEST_SECURITY_REPORT.md
echo.
echo Vuoi aprire il report? (S/N)
set /p open="> "
if /i "%open%"=="S" (
    start TEST_SECURITY_REPORT.md
)

echo.
echo Test completati con successo!
pause

