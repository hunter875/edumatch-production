@description('Deployment location.')
param location string = resourceGroup().location

@description('Deployment environment name.')
param environment string = 'staging'

@description('Azure Container Registry name. Must be globally unique and contain only letters and numbers.')
param acrName string

@description('Container Apps Environment name.')
param containerAppsEnvironmentName string = 'edumatch-${environment}-apps-env'

@description('Log Analytics workspace name.')
param logAnalyticsWorkspaceName string = 'edumatch-${environment}-logs'

@description('Application Insights resource name.')
param applicationInsightsName string = 'edumatch-${environment}-appi'

@description('Initial public image used only to bootstrap Container Apps before the first GitHub Actions deploy.')
param bootstrapImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Expose backend service apps publicly. Keep true for simple staging smoke tests; set false later for production hardening.')
param exposeBackends bool = true

var tags = {
  app: 'edumatch'
  environment: environment
  owner: 'platform'
}

var containerApps = [
  {
    name: 'auth-service'
    port: 8081
    external: exposeBackends
    cpu: json('0.5')
    memory: '1Gi'
    minReplicas: 0
    maxReplicas: 2
  }
  {
    name: 'scholarship-service'
    port: 8082
    external: exposeBackends
    cpu: json('0.5')
    memory: '1Gi'
    minReplicas: 0
    maxReplicas: 2
  }
  {
    name: 'chat-service'
    port: 8083
    external: exposeBackends
    cpu: json('0.5')
    memory: '1Gi'
    minReplicas: 0
    maxReplicas: 2
  }
  {
    name: 'matching-service'
    port: 8000
    external: exposeBackends
    cpu: json('0.5')
    memory: '1Gi'
    minReplicas: 0
    maxReplicas: 2
  }
  {
    name: 'frontend-app'
    port: 3000
    external: true
    cpu: json('0.5')
    memory: '1Gi'
    minReplicas: 0
    maxReplicas: 2
  }
  {
    name: 'nginx-gateway'
    port: 80
    external: true
    cpu: json('0.5')
    memory: '1Gi'
    minReplicas: 0
    maxReplicas: 2
  }
]

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvironmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource apps 'Microsoft.App/containerApps@2024-03-01' = [for app in containerApps: {
  name: app.name
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Multiple'
      ingress: {
        external: app.external
        targetPort: app.port
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.name
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: app.name
          image: bootstrapImage
          resources: {
            cpu: app.cpu
            memory: app.memory
          }
        }
      ]
      scale: {
        minReplicas: app.minReplicas
        maxReplicas: app.maxReplicas
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '80'
              }
            }
          }
        ]
      }
    }
  }
}]

output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output applicationInsightsName string = appInsights.name
output applicationInsightsResourceId string = appInsights.id
output applicationInsightsConnectionString string = appInsights.properties.ConnectionString
output logAnalyticsWorkspaceId string = logAnalytics.id
output containerAppsEnvironmentId string = containerAppsEnvironment.id
output containerAppNames array = [for app in containerApps: app.name]
