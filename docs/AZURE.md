# Ejecutar el análisis fuera de la laptop

El escritorio usa PyQt. La CLI usa el mismo motor de MediaPipe y exporta el MP4 anotado, CSV, JSON y PDF. Ejecutar la CLI en otro equipo traslada el coste de procesar fotogramas a ese equipo.

| Objetivo | Alternativa |
| --- | --- |
| Procesar videos y recuperar los resultados | Azure Container Apps Job manual con la imagen Linux amd64 de esta rama. |
| Usar la interfaz completa desde una laptop lenta | VM Windows con acceso remoto autorizado. Contabilizar cómputo, discos y red. [Facturación de VM](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing) |
| Generar un instalador o `.exe` de Windows | Empaquetar y probar en un runner Windows de GitHub Actions. El empaquetado se haría fuera de la laptop y el procesamiento seguiría ejecutándose donde se abra la app. [Runners de GitHub Actions](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) |

## 1. Comprobar la imagen Docker

En Linux, desde la raíz de un clon Git de esta rama, con Docker disponible. El ZIP excluye el video histórico, así que allí debes sustituir la ruta del video por la de un archivo propio.

```bash
docker build --platform linux/amd64 -t sprint-biomech:local .
container=$(docker create --network none --cpus 1 --memory 2g \
  --mount "type=bind,source=$PWD/VID-20251210-WA0139_1.mp4,target=/data/sample.mp4,readonly" \
  sprint-biomech:local /data/sample.mp4 --output /data/output)
docker start --attach "$container"
docker cp "$container:/data/output" resultados-docker
docker rm "$container"
```

La ejecución deja una subcarpeta por sesión. Debe contener los cuatro archivos. Para comprobar la muestra desde un entorno con las dependencias del proyecto, ejecuta `python -m tests.check_session resultados-docker 209` después de la primera ejecución.

## 2. Construir en Azure sin Docker local

Con Azure CLI autenticada, un Azure Container Registry (ACR) y permisos de compilación, ejecuta este comando desde la raíz de la rama. Cambia el nombre por el de tu registro.

```bash
az acr build --registry NOMBRE_ACR --image sprint-biomech:auditoria --platform linux/amd64 .
```

Esto crea la imagen en el registro de Azure. ACR y sus compilaciones pueden generar cargos. [Compilación de imágenes en Azure](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-quickstart-task-cli)

## 3. Validar y desplegar el Job manual

La [plantilla Bicep](../infra/azure/analysis-job.bicep) crea el Job sobre un entorno, una identidad y dos registros de Azure Files ya existentes. Usa 1 vCPU, 2 GiB, una réplica y cero reintentos automáticos como punto de partida. GitHub Actions compila la plantilla sin una cuenta de Azure. [Esquema del Job](https://learn.microsoft.com/en-us/azure/templates/microsoft.app/2025-07-01/jobs)

1. En el entorno de Container Apps, registra dos recursos compartidos SMB privados de Azure Files. Usa `ReadOnly` para el de entrada y `ReadWrite` para el de salida. Indica a la plantilla los nombres de esos registros del entorno. Los montajes `/data/in` y `/data/out` usan UID y GID `10001` para que el proceso de la imagen pueda escribir y renombrar carpetas en la salida. [Montajes en Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts) · [Permisos de Azure Files SMB](https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-use-files-linux#permissions)
2. Usa una identidad administrada asignada por el usuario y con permiso de descarga en ACR. Verifica `AcrPull` en modo RBAC clásico o `Container Registry Repository Reader` en modo ABAC, que ACR acepte tokens de audiencia ARM y que el entorno pueda llegar al registro y al almacenamiento. La cuenta que despliega también debe poder asignar esa identidad al Job. [Autenticación de ACR](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull) · [Roles de ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
3. Sube a la entrada un video corto autorizado. Para el primer ensayo, usa un solo atleta y FPS constantes. En Azure Cloud Shell o en Bash con Azure CLI autenticada, rellena los valores y revisa el resultado de `what-if`. Este comando muestra los cambios previstos. [Vista previa de ARM](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deploy-what-if)

```bash
job_group='GRUPO_DEL_JOB'
job_name='sprint-biomech-analysis'
template='infra/azure/analysis-job.bicep'
job_params=(
  "jobName=$job_name"
  'location=REGION_DEL_ENTORNO'
  'environmentId=ID_COMPLETO_DEL_ENTORNO'
  'pullIdentityId=ID_COMPLETO_DE_IDENTIDAD'
  'acrLoginServer=SERVIDOR_DE_ACR'
  'image=SERVIDOR_DE_ACR/sprint-biomech:auditoria'
  'inputStorageName=NOMBRE_REGISTRADO_DE_ENTRADA'
  'outputStorageName=NOMBRE_REGISTRADO_DE_SALIDA'
  'inputFileName=video.mp4'
)
az deployment group what-if --resource-group "$job_group" --template-file "$template" --parameters "${job_params[@]}"
```

4. Cuando la vista previa muestre solo el Job previsto, despliega e inicia la prueba. Revisa el estado de ejecución y descarga el MP4 y el PDF de la carpeta creada en Azure Files. Verifica que también estén el CSV y el JSON. Si el proceso se detiene de forma forzada, puede quedar `.partial-*`. Comprueba que ninguna ejecución use esa carpeta antes de retirarla. [Ejecución de Jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs)

```bash
az deployment group create --resource-group "$job_group" --template-file "$template" --parameters "${job_params[@]}"
az containerapp job start --resource-group "$job_group" --name "$job_name"
az containerapp job execution list --resource-group "$job_group" --name "$job_name" --output table
```

El costo real y la velocidad dependen de la región, recursos, transferencia y video. Para comparar con la laptop, mide el proceso completo y también la inferencia por separado. La validación reproducible de esta rama usa Docker y deja pendiente ejecutar el primer Job en una suscripción de Azure. [Precios de Azure Container Apps](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
