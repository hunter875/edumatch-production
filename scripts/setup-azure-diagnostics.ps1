param(
    [Parameter(Mandatory=$true)]
    [string]$LogAnalyticsWorkspaceId,

    [Parameter(Mandatory=$true)]
    [string[]]$ResourceIds,

    [string]$SettingName = "edumatch-diagnostics"
)

$ErrorActionPreference = "Stop"

$metrics = '[{"category":"AllMetrics","enabled":true}]'
$allLogs = '[{"categoryGroup":"allLogs","enabled":true}]'

foreach ($resourceId in $ResourceIds) {
    Write-Host "Configuring diagnostics for $resourceId"

    try {
        az monitor diagnostic-settings create `
            --name $SettingName `
            --resource $resourceId `
            --workspace $LogAnalyticsWorkspaceId `
            --metrics $metrics `
            --logs $allLogs | Out-Null
    } catch {
        Write-Warning "Full logs+metrics diagnostic setting failed for $resourceId. Retrying metrics-only."
        az monitor diagnostic-settings create `
            --name $SettingName `
            --resource $resourceId `
            --workspace $LogAnalyticsWorkspaceId `
            --metrics $metrics | Out-Null
    }
}

Write-Host "Diagnostics configured. Use this for Azure Cache for Redis, Azure Database, RabbitMQ-compatible broker, and Container Apps resources where supported."
