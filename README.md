# Comandante — control de almacén

Aplicación estática para consultar inventario y estadísticas. Al abrirla, busca `actualizacion.json` en la raíz del sitio y carga la versión más reciente. También conserva la opción **Cargar actualización** para importar un archivo manualmente.

## Publicar una actualización de movimientos

1. Genera el archivo JSON desde el programa de Entrega.
2. Coloca una copia en esta carpeta con el nombre `actualizacion.json`, reemplazando el anterior.
3. Confirma que la actualización se puede divulgar: el repositorio y el sitio son públicos, así que cualquier persona puede descargar este archivo y leer los folios, unidades, fechas, consumibles y observaciones que contenga.
4. Publica el archivo con Git:

   ```powershell
   git add actualizacion.json
   git commit -m "Actualiza movimientos del almacén"
   git push
   ```

5. Abre o recarga Comandante. El sitio toma la actualización publicada de GitHub.

Cada equipo que abra la aplicación verá la actualización central publicada al cargar la página. No se guardan cambios en Git desde el navegador. La información activa en la app sigue almacenada localmente en cada navegador.

## Datos y privacidad

No agregues respaldos diarios ni archivos de movimientos con otro nombre al repositorio. Publica únicamente el archivo de actualización autorizado. El catálogo inicial está en `datos-iniciales.js` y también es público.

La aplicación no requiere compilación ni servidor de aplicaciones.
