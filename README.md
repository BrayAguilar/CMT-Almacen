# Comandante — control de almacén

Aplicación estática para consultar inventario y estadísticas. Al abrirla, consulta los archivos JSON de `actualizaciones/` y carga el paquete válido con fecha de generación más reciente. El botón **Cargar actualización** sigue disponible para importar un archivo manualmente.

## Publicar una actualización de movimientos

1. Genera el archivo JSON desde el programa de Entrega.
2. En GitHub, abre la carpeta `actualizaciones` y usa **Add file → Upload files**.
3. Sube el archivo conservando su nombre original, por ejemplo `Actualizacion_Almacen_20261021_00002.json`.
4. Confirma el cambio con un commit en la rama `main`.
5. Abre o recarga Comandante; cargará el paquete válido más reciente de esa carpeta.

Cada corte se queda como un archivo separado. GitHub también conserva el historial de commits. El navegador no sube ni escribe cambios en Git por sí solo.

## Datos y privacidad

Este repositorio y el sitio son públicos. Cualquier persona puede descargar las actualizaciones y leer folios, unidades, fechas, consumibles y observaciones. No subas respaldos diarios ni información que no deba divulgarse.

El catálogo inicial está en `datos-iniciales.js`. La aplicación no requiere compilación ni servidor de aplicaciones.
