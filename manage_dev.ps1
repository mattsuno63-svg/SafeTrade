
# manage_dev.ps1 - SafeTrade Development Manager
# manage_dev.ps1 - SafeTrade Development Manager
$ErrorActionPreference = "Continue"

function Show-Header {
    Clear-Host
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "   SAFETRADE DEVELOPMENT CONTROL PANEL" -ForegroundColor Yellow -BackgroundColor Black
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
}

# Kill any existing node processes to ensure clean slate (OPTIONAL, risky if user has other node apps)
# Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Show-Header
Write-Host "Starting processes..." -ForegroundColor Green

# Crea cartella logs se non esiste
$logsDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# Genera nome file log con timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$nextjsLogFile = Join-Path $logsDir "nextjs_$timestamp.log"
$prismaLogFile = Join-Path $logsDir "prisma_$timestamp.log"
$mainLogFile = Join-Path $logsDir "main_$timestamp.log"

Write-Host "Log files:" -ForegroundColor Cyan
Write-Host "  Next.js: $nextjsLogFile" -ForegroundColor Gray
Write-Host "  Prisma:  $prismaLogFile" -ForegroundColor Gray
Write-Host "  Main:    $mainLogFile" -ForegroundColor Gray
Write-Host ""

# Start Next.js con output reindirizzato a file
$nextjs = Start-Job -ScriptBlock { 
    param($logFile, $workDir)
    Set-Location $workDir
    npm run dev *>&1 | Tee-Object -FilePath $logFile -Append
} -ArgumentList $nextjsLogFile, "c:\Users\ragaz\Desktop\3SafeTrade" -Name "SafeTrade_NextJS"

# Start Prisma Studio con output reindirizzato a file
$studio = Start-Job -ScriptBlock { 
    param($logFile, $workDir)
    Set-Location $workDir
    npx prisma studio *>&1 | Tee-Object -FilePath $logFile -Append
} -ArgumentList $prismaLogFile, "c:\Users\ragaz\Desktop\3SafeTrade" -Name "SafeTrade_PrismaStudio"

Write-Host "Processes started in background." -ForegroundColor Green
Write-Host ""

try {
    # Apri file di log principale per append
    $mainLogStream = [System.IO.StreamWriter]::new($mainLogFile, $true)
    $mainLogStream.AutoFlush = $true
    
    while ($true) {
        Show-Header
        
        $nStatus = Get-Job -Name "SafeTrade_NextJS"
        $sStatus = Get-Job -Name "SafeTrade_PrismaStudio"

        $statusLine1 = " [1] Next.js Server (Port 3000): "
        $statusLine2 = " [2] Prisma Studio  (Port 5555): "
        
        Write-Host $statusLine1 -NoNewline
        if ($nStatus.State -eq 'Running') { 
            Write-Host "RUNNING" -ForegroundColor Green
            $statusLine1 += "RUNNING"
        } else { 
            Write-Host "STOPPED" -ForegroundColor Red
            $statusLine1 += "STOPPED"
        }

        Write-Host $statusLine2 -NoNewline
        if ($sStatus.State -eq 'Running') { 
            Write-Host "RUNNING" -ForegroundColor Green
            $statusLine2 += "RUNNING"
        } else { 
            Write-Host "STOPPED" -ForegroundColor Red
            $statusLine2 += "STOPPED"
        }

        # Check for output from jobs e salva nel log
        $nOut = Receive-Job -Job $nextjs -Keep -ErrorAction SilentlyContinue
        $sOut = Receive-Job -Job $studio -Keep -ErrorAction SilentlyContinue
        
        # Salva output nel log principale
        if ($nOut) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $mainLogStream.WriteLine("[$timestamp] [Next.js] $nOut")
        }
        if ($sOut) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $mainLogStream.WriteLine("[$timestamp] [Prisma] $sOut")
        }
        
        # Simple dashboard info
        Write-Host ""
        Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host " COMMANDS:" -ForegroundColor White
        Write-Host " [Q] Quit and Stop All" -ForegroundColor Yellow
        Write-Host " [R] Restart Next.js" -ForegroundColor Gray
        Write-Host " [L] Open Logs Folder" -ForegroundColor Cyan
        Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host " Logs saved to: $logsDir" -ForegroundColor DarkGray
        
        # Non-blocking key read
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq 'Q') {
                Write-Host "Stopping all services..." -ForegroundColor Yellow
                Stop-Job -Name "SafeTrade_NextJS"
                Stop-Job -Name "SafeTrade_PrismaStudio"
                Remove-Job -Name "SafeTrade_NextJS"
                Remove-Job -Name "SafeTrade_PrismaStudio"
                break
            }
            if ($key.Key -eq 'R') {
                Write-Host "Restarting Next.js..." -ForegroundColor Yellow
                $mainLogStream.WriteLine("$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [SYSTEM] Restarting Next.js...")
                Stop-Job -Name "SafeTrade_NextJS"
                Remove-Job -Name "SafeTrade_NextJS"
                $nextjs = Start-Job -ScriptBlock { 
                    param($logFile, $workDir)
                    Set-Location $workDir
                    npm run dev *>&1 | Tee-Object -FilePath $logFile -Append
                } -ArgumentList $nextjsLogFile, "c:\Users\ragaz\Desktop\3SafeTrade" -Name "SafeTrade_NextJS"
            }
            if ($key.Key -eq 'L') {
                Write-Host "Opening logs folder..." -ForegroundColor Cyan
                Start-Process explorer.exe -ArgumentList $logsDir
            }
        }
        
        Start-Sleep -Seconds 1
    }
}
finally {
    # Ensure cleanup on exit
    if ($mainLogStream) {
        $mainLogStream.WriteLine("$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [SYSTEM] Development environment stopped.")
        $mainLogStream.Close()
    }
    Get-Job | Stop-Job -PassThru | Remove-Job
    Write-Host "Development environment stopped." -ForegroundColor Cyan
    Write-Host "Logs saved in: $logsDir" -ForegroundColor Cyan
}
