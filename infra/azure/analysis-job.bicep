targetScope = 'resourceGroup'

@description('Nombre del Job. Usa minúsculas, números y guiones sin repetir. Empieza con una letra y termina con letra o número.')
@minLength(1)
@maxLength(31)
param jobName string = 'sprint-biomech-analysis'

@description('Región del entorno de Azure Container Apps existente.')
param location string

@description('ID completo del entorno de Azure Container Apps existente.')
param environmentId string

@description('ID completo de la identidad asignada por el usuario que puede descargar la imagen de ACR.')
param pullIdentityId string

@description('Servidor de inicio de sesión de ACR, sin https://.')
param acrLoginServer string

@description('Referencia completa de la imagen de análisis Linux amd64 en ACR. Usa un digest para una prueba reproducible.')
param image string

@description('Nombre del almacenamiento de entrada registrado como ReadOnly en el entorno.')
param inputStorageName string

@description('Nombre del almacenamiento de salida registrado como ReadWrite en el entorno.')
param outputStorageName string

@description('Nombre del archivo dentro del recurso compartido de entrada.')
param inputFileName string = 'video.mp4'

@description('Tiempo máximo de ejecución por réplica en segundos.')
@minValue(1)
param timeoutSeconds int = 3600

// El proceso del Dockerfile usa UID y GID 10001.
var smbMountOptions = 'uid=10001,gid=10001,dir_mode=0750,file_mode=0640'

resource job 'Microsoft.App/jobs@2025-07-01' = {
  name: jobName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentityId}': {}
    }
  }
  properties: {
    environmentId: environmentId
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: timeoutSeconds
      replicaRetryLimit: 0
      manualTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [
        {
          server: acrLoginServer
          identity: pullIdentityId
        }
      ]
      identitySettings: [
        {
          identity: pullIdentityId
          lifecycle: 'None'
        }
      ]
    }
    template: {
      volumes: [
        {
          name: 'input'
          storageType: 'AzureFile'
          storageName: inputStorageName
          mountOptions: smbMountOptions
        }
        {
          name: 'output'
          storageType: 'AzureFile'
          storageName: outputStorageName
          mountOptions: smbMountOptions
        }
      ]
      containers: [
        {
          name: 'analysis'
          image: image
          args: [
            '/data/in/${inputFileName}'
            '--output'
            '/data/out'
          ]
          resources: {
            cpu: 1
            memory: '2Gi'
          }
          volumeMounts: [
            {
              volumeName: 'input'
              mountPath: '/data/in'
            }
            {
              volumeName: 'output'
              mountPath: '/data/out'
            }
          ]
        }
      ]
    }
  }
}

output jobId string = job.id
