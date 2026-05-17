param(
    [switch]$AuthOnly,
    [switch]$ScholarshipOnly,
    [switch]$MatchingOnly,
    [switch]$ChatOnly,
    [switch]$LoadTest,
    [switch]$LargeLoadTest
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$SeedDir = Join-Path $Root "db\seed"

function Import-DotEnv {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    Get-Content -Path $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $parts = $line.Split("=", 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        if ($name) {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

function Get-RequiredEnv {
    param([Parameter(Mandatory = $true)][string]$Name)

    $value = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Missing required environment variable '$Name'. Copy .env.example to .env and fill it first."
    }
    return $value
}

Import-DotEnv (Join-Path $Root ".env")

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI not found. Install Docker Desktop or add docker to PATH."
}

function Invoke-Seed {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $true)][string[]]$DockerArgs
    )

    $Path = Join-Path $SeedDir $File
    if (-not (Test-Path $Path)) {
        throw "Seed file not found: $Path"
    }

    Write-Host "==> Seeding $Name from $File" -ForegroundColor Cyan
    Get-Content -Raw -Path $Path | & docker @DockerArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Seed failed for $Name"
    }

    Write-Host "    done" -ForegroundColor Green
}

$PreviousLocation = Get-Location
Set-Location $Root

$RunAll = -not ($AuthOnly -or $ScholarshipOnly -or $MatchingOnly -or $ChatOnly -or $LoadTest -or $LargeLoadTest)

Write-Host "EduMatch dev data seeder" -ForegroundColor Yellow
Write-Host "Root: $Root"
Write-Host ""

try {
    if ($RunAll -or $AuthOnly -or $LoadTest -or $LargeLoadTest) {
        $authRootPassword = Get-RequiredEnv "AUTH_DB_ROOT_PASSWORD"
        Invoke-Seed `
            -Name "auth-db" `
            -File "auth-dev.sql" `
            -DockerArgs @("compose", "exec", "-T", "auth-db", "mysql", "-uroot", "-p$authRootPassword", "auth_db")
    }

    if ($RunAll -or $ScholarshipOnly -or $LoadTest -or $LargeLoadTest) {
        $scholarshipRootPassword = Get-RequiredEnv "SCHOLARSHIP_DB_ROOT_PASSWORD"
        Invoke-Seed `
            -Name "scholarship-db" `
            -File "scholarship-dev.sql" `
            -DockerArgs @("compose", "exec", "-T", "scholarship-db", "mysql", "-uroot", "-p$scholarshipRootPassword", "scholarship_db")
    }

    if ($LoadTest -or $LargeLoadTest) {
        $scholarshipRootPassword = Get-RequiredEnv "SCHOLARSHIP_DB_ROOT_PASSWORD"
        Invoke-Seed `
            -Name "scholarship-db load test" `
            -File "scholarship-load-test.sql" `
            -DockerArgs @("compose", "exec", "-T", "scholarship-db", "mysql", "-uroot", "-p$scholarshipRootPassword", "scholarship_db")
    }

    if ($LargeLoadTest) {
        $scholarshipRootPassword = Get-RequiredEnv "SCHOLARSHIP_DB_ROOT_PASSWORD"
        Invoke-Seed `
            -Name "scholarship-db large load test" `
            -File "scholarship-large-load-test.sql" `
            -DockerArgs @("compose", "exec", "-T", "scholarship-db", "mysql", "-uroot", "-p$scholarshipRootPassword", "scholarship_db")
    }

    if ($RunAll -or $MatchingOnly) {
        Invoke-Seed `
            -Name "matching-db" `
            -File "matching-dev.sql" `
            -DockerArgs @("compose", "exec", "-T", "matching-db", "psql", "-U", "matching_user", "-d", "matching_db", "-v", "ON_ERROR_STOP=1")
    }

    if ($RunAll -or $ChatOnly) {
        $chatRootPassword = Get-RequiredEnv "CHAT_DB_ROOT_PASSWORD"
        Invoke-Seed `
            -Name "chat-db" `
            -File "chat-dev.sql" `
            -DockerArgs @("compose", "exec", "-T", "chat-db", "mysql", "-uroot", "-p$chatRootPassword", "chat_db")
    }

    Write-Host ""
    Write-Host "Seed complete." -ForegroundColor Green
    Write-Host "Demo users: admin_test/admin123, student1/admin123, student2/admin123, student3/admin123, teacher1/admin123, teacher2/admin123, mit_provider/admin123, stanford_provider/admin123, google_provider/admin123"
    Write-Host "Frontend login accepts email too: admin.test@edumatch.dev, student1@edumatch.dev, teacher1@edumatch.dev"
}
finally {
    Set-Location $PreviousLocation
}
