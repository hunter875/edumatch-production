param(
    [string]$ResourceGroup = "EduMatch-VM-RG-v2",

    [Parameter(Mandatory=$true)]
    [string]$AuthDbUrl,
    [Parameter(Mandatory=$true)]
    [string]$AuthDbUsername,
    [Parameter(Mandatory=$true)]
    [string]$AuthDbPassword,

    [Parameter(Mandatory=$true)]
    [string]$ScholarshipDbUrl,
    [Parameter(Mandatory=$true)]
    [string]$ScholarshipDbUsername,
    [Parameter(Mandatory=$true)]
    [string]$ScholarshipDbPassword,

    [Parameter(Mandatory=$true)]
    [string]$ChatDbUrl,
    [Parameter(Mandatory=$true)]
    [string]$ChatDbUsername,
    [Parameter(Mandatory=$true)]
    [string]$ChatDbPassword,

    [Parameter(Mandatory=$true)]
    [string]$MatchingDbUrl,

    [Parameter(Mandatory=$true)]
    [string]$JwtSecret,

    [Parameter(Mandatory=$true)]
    [string]$RabbitMqHost,
    [Parameter(Mandatory=$true)]
    [string]$RabbitMqUser,
    [Parameter(Mandatory=$true)]
    [string]$RabbitMqPassword,

    [Parameter(Mandatory=$true)]
    [string]$RedisHost,

    [Parameter(Mandatory=$true)]
    [string]$AuthServiceUrl,
    [Parameter(Mandatory=$true)]
    [string]$MatchingServiceUrl,

    [string]$MailUsername = "disabled@example.com",
    [string]$MailPassword = "disabled"
)

$ErrorActionPreference = "Stop"

$AzCommand = "az"
if (-not (Get-Command $AzCommand -ErrorAction SilentlyContinue)) {
    $candidates = @(
        "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
        "C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
        "$env:LOCALAPPDATA\Programs\AzureCLI\wbin\az.cmd"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            $AzCommand = $candidate
            break
        }
    }
}

if (-not (Get-Command $AzCommand -ErrorAction SilentlyContinue) -and -not (Test-Path $AzCommand)) {
    throw "Azure CLI was not found. Install Azure CLI or restart the terminal so az is on PATH."
}

Write-Host "Setting Azure Container App secrets in $ResourceGroup..."

& $AzCommand containerapp secret set `
    --resource-group $ResourceGroup `
    --name auth-service `
    --secrets `
        auth-db-url="$AuthDbUrl" `
        auth-db-username="$AuthDbUsername" `
        auth-db-password="$AuthDbPassword" `
        jwt-secret="$JwtSecret" `
        rabbitmq-host="$RabbitMqHost" `
        rabbitmq-user="$RabbitMqUser" `
        rabbitmq-password="$RabbitMqPassword" `
        redis-host="$RedisHost" `
        mail-username="$MailUsername" `
        mail-password="$MailPassword" | Out-Null

& $AzCommand containerapp secret set `
    --resource-group $ResourceGroup `
    --name scholarship-service `
    --secrets `
        scholarship-db-url="$ScholarshipDbUrl" `
        scholarship-db-username="$ScholarshipDbUsername" `
        scholarship-db-password="$ScholarshipDbPassword" `
        jwt-secret="$JwtSecret" `
        rabbitmq-host="$RabbitMqHost" `
        rabbitmq-user="$RabbitMqUser" `
        rabbitmq-password="$RabbitMqPassword" `
        redis-host="$RedisHost" `
        auth-service-url="$AuthServiceUrl" `
        matching-service-url="$MatchingServiceUrl" | Out-Null

& $AzCommand containerapp secret set `
    --resource-group $ResourceGroup `
    --name chat-service `
    --secrets `
        chat-db-url="$ChatDbUrl" `
        chat-db-username="$ChatDbUsername" `
        chat-db-password="$ChatDbPassword" `
        jwt-secret="$JwtSecret" `
        rabbitmq-host="$RabbitMqHost" `
        rabbitmq-user="$RabbitMqUser" `
        rabbitmq-password="$RabbitMqPassword" `
        auth-service-url="$AuthServiceUrl" | Out-Null

& $AzCommand containerapp secret set `
    --resource-group $ResourceGroup `
    --name matching-service `
    --secrets `
        matching-db-url="$MatchingDbUrl" `
        rabbitmq-host="$RabbitMqHost" `
        rabbitmq-user="$RabbitMqUser" `
        rabbitmq-password="$RabbitMqPassword" `
        jwt-secret="$JwtSecret" | Out-Null

Write-Host "Secrets set. Current secret names:"
& $AzCommand containerapp secret list --resource-group $ResourceGroup --name auth-service --query "[].name" -o table
& $AzCommand containerapp secret list --resource-group $ResourceGroup --name scholarship-service --query "[].name" -o table
& $AzCommand containerapp secret list --resource-group $ResourceGroup --name chat-service --query "[].name" -o table
& $AzCommand containerapp secret list --resource-group $ResourceGroup --name matching-service --query "[].name" -o table
