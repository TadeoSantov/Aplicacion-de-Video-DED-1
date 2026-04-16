# Arquitectura

La aplicación sigue un patrón **Modelo-Vista-Controlador** con una capa de servicio opcional para lógica que cruza varios modelos. El backend expone una API REST y el cliente es una SPA ligera servida como archivos estáticos.

## Flujo de una petición

```
┌────────┐  fetch  ┌─────────┐  require  ┌──────────────┐  llama  ┌────────┐  prisma  ┌────────┐
│ Vista  │────────►│  Fetch  │──────────►│  Controlador │────────►│ Modelo │─────────►│ SQLite │
│ (HTML) │         │  (JS)   │           │   (Express)  │         │ (JS)   │          │        │
└────────┘ ◄───────┴─────────┴ ◄─────────┴──────────────┴ ◄───────┴────────┴ ◄────────┴────────┘
                    respuesta JSON
```

1. La vista (HTML + JS de UI) dispara una acción.
2. Un módulo `Fetch_*.js` construye la petición HTTP hacia la API.
3. Express enruta según `app.js` al enrutador correspondiente (`Rutas/*.js`).
4. El controlador valida el payload, invoca modelo(s) y da forma a la respuesta.
5. El modelo ejecuta la operación Prisma contra SQLite.

Si la operación requiere coordinar varios modelos (por ejemplo eliminar una carrera junto con sus UAs), el controlador delega en un módulo de `CapaServicio/`.

## Responsabilidades por capa

### `Rutas/`

Mapeo directo URL → función del controlador. No contienen lógica. Un archivo por recurso:

```
Rutas/
├── Carreras_Rutas.js
├── Facultades_Rutas.js
├── Palabras_Rutas.js
├── Sesion_Rutas.js
├── Uas_Rutas.js
├── Usuario_Rutas.js
└── Videos_Rutas.js
```

### `Controladores/`

- Reciben `req`/`res`.
- Validan presencia y tipos de los datos recibidos.
- Normalizan cadenas (minúsculas, trim) antes de persistir.
- Capitalizan nombres al responder (función `capitalizarTitulo`).
- Devuelven códigos HTTP significativos (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`).

### `Modelos/`

Funciones que envuelven operaciones Prisma. Son deliberadamente delgadas: cada función equivale a una consulta o mutación concreta. Ejemplos:

- `Modelo_Usuario.obtenerPorNombre(nombre)`
- `Modelo_Videos.listarVideos(input)`
- `Modelo_Sesiones.crearSesion(usuarioId, { singleSession })`

### `CapaServicio/`

Lógica reutilizable u operaciones que tocan más de un modelo:

| Archivo | Propósito |
|---|---|
| `seguridad.service.js` | Hash/verificación de contraseñas con bcrypt + pepper, política de fortaleza |
| `rateLimit.service.js` | Configuración de `express-rate-limit` (login y general) |
| `carrera.service.js` | Eliminación en cascada de carreras con sus UAs |
| `ua.service.js` | Operaciones compuestas sobre UAs |

## Cliente

Los JavaScript del cliente están separados en dos estilos:

- `Fetch_*.js`: sólo contiene llamadas `fetch` a la API. Facilita reutilizar la misma llamada desde varias vistas.
- Archivos de lógica (`Inicio.js`, `Migaleria.js`, `RegistrarVideos.js`, etc.): orquestan DOM, validaciones y render. Importan los `Fetch_*` que necesitan.

La URL base de la API se define en `Cliente/Js/config.js`:

```js
window.API_URL = "http://localhost:3002";
```

En producción debe cambiarse allí y agregarse el origen correspondiente a `CORS_ORIGINS` en el `.env`.

## Sesiones

- Al iniciar sesión correctamente el cliente llama a `POST /sessions/crear` y guarda el `SesionId` devuelto en `localStorage`.
- Cada cambio de página, la navbar llama a `POST /sessions/actual` para validar que la sesión sigue viva y obtener datos del usuario (rol, facultad).
- `POST /sessions/cerrar` elimina el registro en BD; el cliente limpia `localStorage`.
- El identificador de sesión se genera con `crypto.randomBytes(32).toString("hex")` (256 bits).
- Modo `singleSession`: si se crea con ese flag, todas las sesiones previas del usuario se borran antes de emitir la nueva.

## Aprobación de videos

Los videos tienen un campo `aprobado` con los siguientes estados:

| Valor | Estado | Visible al público |
|---|---|---|
| `0` | En espera | No |
| `1` | Aprobado | Sí |
| `2` | Rechazado | No (guarda `comentario`) |

El endpoint público `GET /videos` filtra por defecto por `aprobado=1`. El listado administrativo usa `GET /videos/en-espera` y el cambio de estado se hace con `POST /videos/actualizar-estado`.

## Errores

- Cada controlador que realiza operaciones susceptibles a fallo captura con `try/catch` y devuelve `500` con un mensaje genérico.
- `app.js` registra un manejador global (`app.use((err, req, res, next) => …)`) como red de seguridad.
- El handler de 404 (`app.use((req, res) => …)`) responde con JSON coherente al resto de la API.
