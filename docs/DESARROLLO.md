# Guía de desarrollo

## Requisitos

| Herramienta | Versión de referencia |
|---|---|
| Node.js | 22.17.0 |
| npm | 10.9.2 |
| Prisma CLI | 6.11.1 |
| SQLite | 3.46.0 |

## Primera instalación

```bash
git clone https://github.com/tiolax/Aplicacion-de-Video-DED.git
cd Aplicacion-de-Video-DED
npm install
npx prisma migrate dev
```

## Ejecución diaria

En dos terminales:

```bash
# Terminal 1 — backend
node server.js
```

```bash
# Terminal 2 — frontend estático
npx http-server -p 8080
```

Abrir `http://127.0.0.1:8080/Cliente/Html/Login.html`.

> Evitar Live Server de VS Code: recarga automáticamente al guardar, lo que interrumpe formularios en edición.

## Scripts disponibles

`package.json` no define scripts de desarrollo además del placeholder de test. Comandos útiles que conviene conocer:

| Acción | Comando |
|---|---|
| Arrancar backend | `node server.js` |
| Abrir explorador de BD | `npx prisma studio` |
| Nueva migración | `npx prisma migrate dev --name <nombre>` |
| Regenerar cliente Prisma | `npx prisma generate` |
| Validar sintaxis de un archivo | `node --check ruta/archivo.js` |

## Extensiones recomendadas para VS Code

- **Prisma** — resaltado y autocompletado del schema.
- **SQLite Viewer** — abrir `prisma/dev.db` directamente desde el editor.
- **EchoAPI for VS Code** — probar endpoints sin salir del IDE.

## Flujo para añadir un recurso nuevo

Por ejemplo, agregar la entidad `Etiqueta`:

1. **Schema**. Añadir el modelo a `prisma/schema.prisma` y ejecutar `npx prisma migrate dev --name add_etiqueta`.
2. **Modelo**. Crear `Modelos/Modelo_Etiqueta.js` con las consultas Prisma necesarias. Exportar funciones pequeñas y nombradas.
3. **Controlador**. Crear `Controladores/Control_Etiqueta.js`. Aquí van las validaciones y la forma de la respuesta.
4. **Rutas**. Crear `Rutas/Etiquetas_Rutas.js` y montarlo en `app.js` con `app.use("/etiquetas", EtiquetasRutas)`.
5. **Servicio** (opcional). Si la operación implica varios modelos, encapsularla en `CapaServicio/etiqueta.service.js`.
6. **Cliente**. Crear `Cliente/Js/Fetch_Etiquetas.js` con las llamadas HTTP y una o varias vistas en `Cliente/Html/`.
7. **Documentación**. Añadir el recurso a `docs/API.md` y, si procede, al diagrama en `docs/BASE_DE_DATOS.md`.

## Convenciones de código

- **Módulos ES** (`"type": "module"` en `package.json`). Usar `import`/`export`.
- Importaciones relativas con extensión `.js` explícita (requisito de Node ESM).
- Nombres de archivo: `PascalCase` para módulos con un propósito claro (`Modelo_Usuario.js`), `camelCase.service.js` para la capa de servicio.
- Rutas de API en castellano, en plural.
- Los controladores siempre devuelven `res.status(...).json(...)` explícitamente; evitar respuestas implícitas.
- Al almacenar nombres (facultad, carrera, UA, palabras clave) se normalizan a minúsculas; al responder se capitalizan con `capitalizarTitulo`.

## Trabajo con la base de datos

- El archivo `prisma/dev.db` es local y **no** debe compartirse entre entornos.
- Para inspeccionar datos en desarrollo: `npx prisma studio`.
- Para ejecutar SQL directamente: `sqlite3 prisma/dev.db` o usando SQLite Viewer.

## Pendientes y mejoras propuestas

Lista heredada del autor original con añadidos posteriores:

1. Unificar paleta de colores (azules corporativos) mediante variables CSS globales.
2. Dar coherencia visual al estilo entre vistas.
3. Modo oscuro.
4. Reorganizar los módulos `Fetch_*` eliminando duplicación.
5. ~~Validaciones de contraseña~~ (implementado).
6. Mover validaciones que aún residen en los modelos a sus controladores.
7. Job de limpieza de sesiones con más de 7 días.
8. Paginación en la vista “Mis Videos”.
9. Montar `requireAuth` sobre las rutas administrativas.
10. Migrar `sesionID` a cookies `HttpOnly` firmadas.
11. Introducir una librería de validación declarativa (Zod o Joi) para los cuerpos de petición.
12. Añadir suite de pruebas automatizadas (la entrada `test` en `package.json` aún apunta al placeholder de npm).

## Despliegue

Resumen del checklist completo que vive en `docs/SEGURIDAD.md`:

- Servir tras HTTPS.
- Ajustar `CORS_ORIGINS`, `PASSWORD_PEPPER`, `BCRYPT_ROUNDS`.
- Ajustar `Cliente/Js/config.js` con la URL pública del backend.
- Configurar `NODE_ENV=production`.
- Programar respaldos del archivo SQLite.

## Contacto

Dudas o contribuciones: abrir un issue o PR en el repositorio ([@tiolax](https://github.com/tiolax)).
