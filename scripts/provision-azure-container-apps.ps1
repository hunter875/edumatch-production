param(
    [string]$ResourceGroup = "EduMatch-VM-RG-v2",
    [string]$Location = "southeastasia",
    [string]$Environment = "staging",
    [Parameter(Mandatory=$true)]
    [string]$AcrName,
    [bool]$ExposeBackends = $true
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

Write-Host "Provisioning EduMatch Azure Container Apps infrastructure..."
Write-Host "Resource group: $ResourceGroup"
Write-Host "Location: $Location"
Write-Host "Environment: $Environment"
Write-Host "ACR name: $AcrName"

& $AzCommand provider register --namespace Microsoft.App | Out-Null
& $AzCommand provider register --namespace Microsoft.ContainerRegistry | Out-Null
& $AzCommand provider register --namespace Microsoft.OperationalInsights | Out-Null
& $AzCommand provider register --namespace Microsoft.Insights | Out-Null

& $AzCommand group create `
    --name $ResourceGroup `
    --location $Location | Out-Null

$deploymentName = "edumatch-container-apps-$Environment"

& $AzCommand deployment group create `
    --name $deploymentName `
    --resource-group $ResourceGroup `
    --template-file "infra/azure/container-apps.bicep" `
    --parameters `
        location=$Location `
        environment=$Environment `
        acrName=$AcrName `
        exposeBackends=$ExposeBackends

Write-Host ""
Write-Host "Provision finished."
Write-Host "ACR login server:"
& $AzCommand acr show --name $AcrName --query loginServer -o tsv

Write-Host ""
Write-Host "Container Apps:"
& $AzCommand containerapp list --resource-group $ResourceGroup --query "[].{name:name,fqdn:properties.configuration.ingress.fqdn}" -o table

Write-Host ""
Write-Host "Next:"
Write-Host "1. Set Container App secrets with scripts/set-containerapp-secrets.ps1."
Write-Host "2. Set GitHub secrets/variables."
Write-Host "3. Run Build and Deploy EduMatch System with operation=deploy, service=all, environment=$Environment."
