# Comandante — consulta de almacén

Aplicación estática para consultar inventario y estadísticas. Al abrirse, busca en segundo plano paquetes depurados en `datos_comandante/`.

## Flujo de actualización

1. En Administración, importa el archivo original de Entrega.
2. Pulsa **Crear paquete depurado para Comandante** y selecciona la carpeta `Aplicacion_Administrador`. Administración guardará el archivo en `Aplicacion_Administrador/Actualizacione_Comandante/Resumen_Comandante_*.json`, junto a `Actualizaciones_Entrega`.
3. Para publicar la actualización, copia únicamente el paquete depurado a esta carpeta `datos_comandante/` del repositorio y confirma el cambio en `main`.
4. Comandante sincroniza el paquete más reciente al abrirse.

El paquete contiene existencias y movimientos agregados por fecha, modelo y una clave anónima de unidad. No contiene nombres de personas, folios, números o tipos de documentos, extensiones ni observaciones. El repositorio y GitHub Pages son públicos; las cantidades de inventario, modelos, fechas y claves anónimas de unidad se podrán consultar públicamente.

No subas aquí archivos JSON originales de Entrega, respaldos, libros de Excel ni bases de datos. Las reglas de `.gitignore` ayudan a evitar esos archivos por accidente.
