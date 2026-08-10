param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory=$true)]
    [string]$AppInsightsResourceId,

    [string]$Environment = "staging",

    [string[]]$ActionGroupResourceIds = @()
)

$ErrorActionPreference = "Stop"

Write-Host "Deploying EduMatch Azure observability resources..."
Write-Host "Resource group: $ResourceGroup"
Write-Host "Environment: $Environment"
Write-Host "Application Insights: $AppInsightsResourceId"

$actionGroupsJson = ($ActionGroupResourceIds | ConvertTo-Json -Compress)
if ([string]::IsNullOrWhiteSpace($actionGroupsJson)) {
    $actionGroupsJson = "[]"
}

az deployment group create `
    --resource-group $ResourceGroup `
    --template-file "infra/azure/observability.bicep" `
    --parameters `
        appInsightsResourceId="$AppInsightsResourceId" `
        environment="$Environment" `
        actionGroupResourceIds="$actionGroupsJson"

Write-Host "Observability workbook and alert rules deployed."
