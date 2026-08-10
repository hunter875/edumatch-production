@description('Azure region for observability resources.')
param location string = resourceGroup().location

@description('Application Insights component resource id used by EduMatch services.')
param appInsightsResourceId string

@description('Optional action group ids for alerts. Leave empty to create silent alerts first.')
param actionGroupResourceIds array = []

@description('Deployment environment tag.')
param environment string = 'staging'

@description('P95 latency threshold in milliseconds.')
param p95LatencyThresholdMs int = 500

@description('5xx count threshold per 5-minute window.')
param serverErrorThreshold int = 5

@description('Failed dependency count threshold per 5-minute window.')
param dependencyErrorThreshold int = 5

var tags = {
  app: 'edumatch'
  environment: environment
  owner: 'platform'
}

resource apiP95Alert 'Microsoft.Insights/scheduledQueryRules@2022-06-15' = {
  name: 'edumatch-${environment}-api-p95-latency'
  location: location
  tags: tags
  properties: {
    displayName: 'EduMatch API p95 latency high'
    description: 'Fires when any service has p95 request latency above the production budget.'
    enabled: true
    severity: 2
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          query: '''
requests
| where timestamp > ago(5m)
| summarize p95Ms=percentile(duration, 95) by cloud_RoleName
| where p95Ms > ${p95LatencyThresholdMs}
| summarize AggregatedValue=count()
'''
          timeAggregation: 'Total'
          metricMeasureColumn: 'AggregatedValue'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 2
            minFailingPeriodsToAlert: 2
          }
        }
      ]
    }
    actions: {
      actionGroups: actionGroupResourceIds
    }
  }
}

resource api5xxAlert 'Microsoft.Insights/scheduledQueryRules@2022-06-15' = {
  name: 'edumatch-${environment}-api-5xx'
  location: location
  tags: tags
  properties: {
    displayName: 'EduMatch API 5xx spike'
    description: 'Fires when server errors cross the 5-minute threshold.'
    enabled: true
    severity: 1
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          query: '''
requests
| where timestamp > ago(5m)
| where toint(resultCode) >= 500
| summarize AggregatedValue=count()
'''
          timeAggregation: 'Total'
          metricMeasureColumn: 'AggregatedValue'
          operator: 'GreaterThan'
          threshold: serverErrorThreshold
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: actionGroupResourceIds
    }
  }
}

resource dependencyFailureAlert 'Microsoft.Insights/scheduledQueryRules@2022-06-15' = {
  name: 'edumatch-${environment}-dependency-failures'
  location: location
  tags: tags
  properties: {
    displayName: 'EduMatch dependency failures'
    description: 'Fires when DB, Redis, RabbitMQ, HTTP, or other dependency calls fail repeatedly.'
    enabled: true
    severity: 2
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          query: '''
dependencies
| where timestamp > ago(5m)
| where success == false
| summarize AggregatedValue=count()
'''
          timeAggregation: 'Total'
          metricMeasureColumn: 'AggregatedValue'
          operator: 'GreaterThan'
          threshold: dependencyErrorThreshold
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: actionGroupResourceIds
    }
  }
}

resource matchingFallbackAlert 'Microsoft.Insights/scheduledQueryRules@2022-06-15' = {
  name: 'edumatch-${environment}-matching-fallback'
  location: location
  tags: tags
  properties: {
    displayName: 'EduMatch matching fallback responses'
    description: 'Fires when recommendation cache/read-model misses cause empty fallback responses.'
    enabled: true
    severity: 3
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: '''
customMetrics
| where timestamp > ago(15m)
| where name == "matching_recommendation_fallback_total"
| summarize AggregatedValue=sum(value)
'''
          timeAggregation: 'Total'
          metricMeasureColumn: 'AggregatedValue'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: actionGroupResourceIds
    }
  }
}

resource workbook 'Microsoft.Insights/workbooks@2021-08-01' = {
  name: guid(resourceGroup().id, 'edumatch-observability-${environment}')
  location: location
  kind: 'shared'
  tags: tags
  properties: {
    displayName: 'EduMatch Observability - ${environment}'
    category: 'workbook'
    sourceId: appInsightsResourceId
    serializedData: string({
      version: 'Notebook/1.0'
      items: [
        {
          type: 1
          name: 'title'
          content: {
            json: '# EduMatch Observability\nEnvironment: **${environment}**\n\nThis workbook tracks request latency, errors, dependency failures, cache metrics, and release metadata.'
          }
        }
        {
          type: 3
          name: 'request_p95_by_service'
          content: {
            version: 'KqlItem/1.0'
            query: 'requests\n| summarize p50=percentile(duration, 50), p95=percentile(duration, 95), p99=percentile(duration, 99), requests=count() by cloud_RoleName, bin(timestamp, 5m)\n| order by timestamp desc'
            size: 0
            title: 'API latency by service'
            queryType: 0
            resourceType: 'microsoft.insights/components'
          }
        }
        {
          type: 3
          name: 'errors_by_service'
          content: {
            version: 'KqlItem/1.0'
            query: 'requests\n| where toint(resultCode) >= 400\n| summarize errors=count() by cloud_RoleName, resultCode, bin(timestamp, 5m)\n| order by timestamp desc'
            size: 0
            title: '4xx/5xx by service'
            queryType: 0
            resourceType: 'microsoft.insights/components'
          }
        }
        {
          type: 3
          name: 'dependency_failures'
          content: {
            version: 'KqlItem/1.0'
            query: 'dependencies\n| summarize calls=count(), failures=countif(success == false), p95=percentile(duration, 95) by cloud_RoleName, type, target, bin(timestamp, 5m)\n| order by timestamp desc'
            size: 0
            title: 'DB/Redis/RabbitMQ/HTTP dependencies'
            queryType: 0
            resourceType: 'microsoft.insights/components'
          }
        }
        {
          type: 3
          name: 'matching_cache'
          content: {
            version: 'KqlItem/1.0'
            query: 'customMetrics\n| where name in ("matching_cache_events_total", "matching_recommendation_fallback_total")\n| summarize value=sum(value) by name, tostring(customDimensions.cache), tostring(customDimensions.outcome), tostring(customDimensions.target_type), bin(timestamp, 5m)\n| order by timestamp desc'
            size: 0
            title: 'Matching cache hit/miss/fallback'
            queryType: 0
            resourceType: 'microsoft.insights/components'
          }
        }
        {
          type: 3
          name: 'release_versions'
          content: {
            version: 'KqlItem/1.0'
            query: 'traces\n| where message has "http_request"\n| parse message with * " env=" env " version=" version " commit=" commit\n| summarize count() by cloud_RoleName, env, version, commit\n| order by count_ desc'
            size: 0
            title: 'Release/version seen in logs'
            queryType: 0
            resourceType: 'microsoft.insights/components'
          }
        }
      ]
    })
  }
}
