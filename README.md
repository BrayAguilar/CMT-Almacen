# Comandante — control de almacén

Aplicación estática independiente para consultar inventario y estadísticas e importar el archivo de actualización generado por el programa de Entrega.

## Publicar

Sube el contenido de esta carpeta a un repositorio Git de tu propiedad y configura el alojamiento estático del proveedor para servir `index.html` desde la raíz. No requiere compilación ni servidor de aplicaciones.

## Datos y privacidad

La aplicación guarda sus datos en el almacenamiento local del navegador y permite importar archivos `Actualizacion_Almacen_*.json`. Publicar el sitio no publica ni sincroniza esos registros. Cada computadora/navegador debe importar el archivo de actualización que corresponda. No agregues respaldos ni archivos de movimientos al repositorio: pueden incluir datos de las entregas.

El catálogo inicial se incluye en `datos-iniciales.js`. Los archivos de movimientos no se incluyen en esta publicación.
