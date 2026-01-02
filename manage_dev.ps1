
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

# Start Next.js
$nextjs = Start-Job -ScriptBlock { 
    Set-Location "c:\Users\ragaz\Desktop\3SafeTrade"
    npm run dev 
} -Name "SafeTrade_NextJS"

# Start Prisma Studio
$studio = Start-Job -ScriptBlock { 
    Set-Location "c:\Users\ragaz\Desktop\3SafeTrade"
    npx prisma studio 
} -Name "SafeTrade_PrismaStudio"

Write-Host "Processes started in background." -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        Show-Header
        
        $nStatus = Get-Job -Name "SafeTrade_NextJS"
        $sStatus = Get-Job -Name "SafeTrade_PrismaStudio"

        Write-Host " [1] Next.js Server (Port 3000): " -NoNewline
        if ($nStatus.State -eq 'Running') { Write-Host "RUNNING" -ForegroundColor Green } else { Write-Host "STOPPED" -ForegroundColor Red }

        Write-Host " [2] Prisma Studio  (Port 5555): " -NoNewline
        if ($sStatus.State -eq 'Running') { Write-Host "RUNNING" -ForegroundColor Green } else { Write-Host "STOPPED" -ForegroundColor Red }

        # Check for output from jobs
        $nOut = Receive-Job -Job $nextjs -Keep -ErrorAction SilentlyContinue
        $sOut = Receive-Job -Job $studio -Keep -ErrorAction SilentlyContinue
        
        # Simple dashboard info
        Write-Host ""
        Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
        Write-Host " COMMANDS:" -ForegroundColor White
        Write-Host " [Q] Quit and Stop All" -ForegroundColor Yellow
        Write-Host " [R] Restart Next.js" -ForegroundColor Gray
        Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
        
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
                Stop-Job -Name "SafeTrade_NextJS"
                Remove-Job -Name "SafeTrade_NextJS"
                $nextjs = Start-Job -ScriptBlock { 
                    Set-Location "c:\Users\ragaz\Desktop\3SafeTrade"
                    npm run dev 
                } -Name "SafeTrade_NextJS"
            }
        }
        
        Start-Sleep -Seconds 1
    }
}
finally {
    # Ensure cleanup on exit
    Get-Job | Stop-Job -PassThru | Remove-Job
    Write-Host "Development environment stopped." -ForegroundColor Cyan
}
