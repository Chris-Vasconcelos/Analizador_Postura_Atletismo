# Ejecutar el análisis fuera de la laptop

El escritorio usa PyQt. La CLI usa el mismo motor de MediaPipe y exporta el MP4 anotado, CSV, JSON y PDF. Ejecutar la CLI en otro equipo traslada el coste de procesar fotogramas a ese equipo.

| Objetivo | Alternativa |
| --- | --- |
| Procesar videos y recuperar los resultados | Azure Container Apps Job manual con la imagen Linux amd64 de esta rama. |
| Usar la interfaz completa desde una laptop lenta | VM Windows con acceso remoto autorizado. Contabilizar cómputo, discos y red. [Facturación de VM](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing) |
| Generar un instalador o `.exe` de Windows | Empaquetar y probar en un runner Windows de GitHub Actions. El empaquetado se haría fuera de la laptop y el procesamiento seguiría ejecutándose donde se abra la app. [Runners de GitHub Actions](https://docs.github.com/en/actions/reference/runners/github-hosted-runners) |

## 1. Comprobar la imagen Docker

En Linux, desde la raíz del repositorio, con Docker disponible:

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

## 3. Ejecutar un video de prueba en Azure

1. Crea un entorno de Container Apps y registra dos recursos compartidos SMB de Azure Files. Monta el de entrada en `/data/in` como `ReadOnly` y el de resultados en `/data/out` como `ReadWrite`. Los permisos del montaje de salida deben permitir escribir y renombrar carpetas al UID y GID `10001` de la imagen. Si el montaje necesita parámetros explícitos, configura `uid=10001,gid=10001,file_mode=0660,dir_mode=0770` en `mountOptions` del volumen de salida. Usa almacenamiento privado para grabaciones de atletas. [Montajes de Azure Files](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts)
2. Crea un Job manual con la imagen de ACR, una réplica, 1 vCPU y 2 GiB como punto de partida. Autoriza la descarga de la imagen desde el registro, preferentemente mediante identidad administrada. Usa un tiempo máximo de ejecución acorde con la longitud del video. [Jobs manuales](https://learn.microsoft.com/en-us/azure/container-apps/jobs) · [Ejemplo de Job con volúmenes](https://learn.microsoft.com/en-us/rest/api/resource-manager/containerapps/jobs/create-or-update?view=rest-resource-manager-containerapps-2025-07-01)
3. Sube un video corto al recurso compartido de entrada. Conserva el comando de la imagen y configura los argumentos del contenedor como `['/data/in/video.mp4', '--output', '/data/out']`, usando el nombre real del archivo. Para un primer ensayo, usa un solo atleta y un video con FPS constantes.
4. Inicia el Job manualmente. Comprueba su salida, tiempo de ejecución y la creación de una única carpeta completa en Azure Files. Descarga y abre el MP4 y el PDF. Si se detiene el proceso de forma forzada, puede quedar una carpeta `.partial-*`. Comprueba que ninguna ejecución la usa antes de retirarla.

El costo real y la velocidad dependen de la región, recursos, transferencia y video. Para comparar con la laptop, mide el proceso completo y también la inferencia por separado. La validación reproducible de esta rama usa Docker y deja pendiente ejecutar el primer Job en una suscripción de Azure. [Precios de Azure Container Apps](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
