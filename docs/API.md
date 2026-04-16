# Referencia de la API

Base URL por defecto: `http://localhost:3002`.

Todas las peticiones y respuestas usan `application/json`. Salvo indicación explícita, los cuerpos de respuesta exitosos incluyen un campo `success: true`.

## Convenciones generales

- Los endpoints que reciben identificadores por cuerpo esperan el campo `id` como número.
- Los filtros de listado de videos van por **query string**; el resto de endpoints usan `POST` con cuerpo JSON, con independencia de que la operación sea semánticamente una consulta. Es una decisión del proyecto heredada.
- Códigos de estado empleados: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `429`, `500`.

## Rate limiting

| Ámbito | Límite | Respuesta al exceder |
|---|---|---|
| Global (todas las rutas) | 120 req/min por IP | `429` |
| `POST /usuarios/login` | 10 req / 15 min por IP | `429` con `{ success: false, mensaje: "Demasiados intentos..." }` |
| `POST /usuarios/validaradmin` | 10 req / 15 min por IP | idem |

---

## Usuarios

### `POST /usuarios/crear`

Registra un nuevo usuario no administrador.

**Body**

```json
{
  "nombre": "docente01",
  "password": "Seguro123!",
  "facultad": 2
}
```

**Respuestas**

- `201` usuario creado.
- `400` datos incompletos o contraseña que no cumple la política.
- `409` nombre ya existente, o la facultad ya tiene un usuario asignado.

### `POST /usuarios/login`

**Body**: `{ "nombre": "...", "password": "..." }`

**200**

```json
{
  "success": true,
  "mensaje": "Login exitoso",
  "usuarioEcontrado": {
    "id": 1,
    "nombre": "docente01",
    "facultad": 2,
    "facultadnombre": "Ingeniería",
    "admin": false
  }
}
```

**401** credenciales inválidas o usuario dado de baja.

### `POST /usuarios/validaradmin`

Valida la contraseña del administrador registrado.

**Body**: `{ "contra": "..." }` → `200` si coincide, `401` en caso contrario.

### `POST /usuarios/obtener-por-id`

**Body**: `{ "id": 3 }` → datos del usuario (sin el hash de contraseña).

### `GET /usuarios/todos`

Lista todos los usuarios con información agregada (facultad, totales de videos, sesión activa, estado de baja).

### `POST /usuarios/actualizar`

**Body**

```json
{
  "id": 5,
  "data": {
    "nombre_de_usuario": "nuevo_nombre",
    "password": "Otro123!",
    "baja": true
  }
}
```

Si se envía `password`, se valida contra la política y se hashea antes de guardar. `400` en caso de política no satisfecha, `409` si el nombre nuevo colisiona.

---

## Sesiones

### `POST /sessions/crear`

**Body**: `{ "usuarioId": 1, "singleSession": true }`

Crea un registro en la tabla `Session` con un id aleatorio hex de 64 caracteres.

**201**

```json
{ "ok": true, "SesionId": "a1b2…", "sesion": { "id": "…", "usuarioId": 1, "createdAt": "…" } }
```

### `POST /sessions/actual`

**Body**: `{ "sesionID": "…" }`

**200**

```json
{
  "authenticated": true,
  "usuarioId": 1,
  "sessionId": "…",
  "admin": false,
  "usuarioNombre": "docente01",
  "facultad_id": 2,
  "facultad_nombre": "Ingeniería"
}
```

**401** si la sesión no existe o el id no fue provisto.

### `POST /sessions/cerrar`

**Body**: `{ "sesionID": "…" }` → elimina la sesión.

---

## Facultades

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/facultades/todos` | Lista plana de facultades |
| `GET` | `/facultades/info` | Facultades con sus carreras y contadores |
| `POST` | `/facultades/crear` | `{ nombre }` |
| `POST` | `/facultades/actualizar` | `{ id, nombre }` |
| `POST` | `/facultades/eliminar` | `{ id }` |
| `POST` | `/facultades/obtener-por-id` | `{ id_facultad }` |

Los nombres se normalizan a minúsculas al guardar y se capitalizan al responder.

## Carreras

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/carreras/info` | Todas las carreras con su facultad |
| `POST` | `/carreras/porfacu` | `{ facu }` — carreras de una facultad |
| `POST` | `/carreras/crear` | `{ nombre, facultad_id }` |
| `POST` | `/carreras/actualizar` | `{ id, nombre }` |
| `POST` | `/carreras/eliminar` | `{ id }` |
| `POST` | `/carreras/eliminarencascada` | Elimina carrera y todas sus UAs |

## Unidades de Aprendizaje (UAs)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/UAs/info` | Todas las UAs con su carrera |
| `POST` | `/UAs/crear` | `{ nombre, modalidad, carreraSelecId }` |
| `POST` | `/UAs/actualizar` | `{ id, nombre, modalidad }` |
| `POST` | `/UAs/eliminar` | `{ id }` |
| `POST` | `/UAs/carreras` | UAs de una carrera dada |
| `POST` | `/UAs/Obtener-por-id` | Detalle incluyendo carrera |

## Palabras clave

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/palabras/todos` | Lista todas las palabras |
| `POST` | `/palabras/crear` | `{ palabra }` |
| `POST` | `/palabras/editar` | `{ palabra, nuevapalabra }` |
| `POST` | `/palabras/eliminar` | `{ palabra }` |

---

## Videos

### `GET /videos`

Listado público con paginación, filtros y ordenamiento. Devuelve solo videos con `aprobado = 1` salvo que se indique lo contrario.

**Query string**

| Parámetro | Tipo | Descripción | Default |
|---|---|---|---|
| `page` | int | Página (≥ 1) | `1` |
| `per_page` | int | Tamaño de página (1–100) | `10` |
| `sort_by` | `fecha_de_registro` \| `titulo` | Campo de orden | `fecha_de_registro` |
| `sort_dir` | `asc` \| `desc` | Dirección | `desc` |
| `q` | string | Búsqueda en título y descripción | — |
| `aprobado` | `0` \| `1` \| `2` | Filtro por estado | — |
| `ua_id` | int | Filtrar por UA | — |
| `carrera_id` | int | Filtrar por carrera | — |
| `facultad_id` | int | Filtrar por facultad | — |
| `date_from` | ISO date | Desde | — |
| `date_to` | ISO date | Hasta | — |
| `palabras` | lista separada por comas de ids | Filtrar por palabras clave | — |

**Respuesta**

```json
{
  "data": [ /* items */ ],
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 42,
    "total_pages": 5,
    "sort_by": "fecha_de_registro",
    "sort_dir": "desc",
    "applied_filters": { "q": null, "aprobado": 1, "ua_id": null, "...": "..." }
  },
  "links": {
    "self": "http://.../videos?page=1&per_page=10",
    "prev": null,
    "next": "http://.../videos?page=2&per_page=10"
  }
}
```

### `POST /videos/crear`

**Body**

```json
{
  "titulo": "Derivadas parciales",
  "descripcion": "Introducción…",
  "identificador": "dQw4w9WgXcQ",
  "fase": "intro",
  "usuario_id": 3,
  "ua_id": 7,
  "palabras": [1, 4, 9]
}
```

El campo `identificador` debe ser único (suele ser el id de YouTube). El video nace con `aprobado = 0`.

### `POST /videos/por-usuario`

**Body**: `{ "usuario_id": 3 }` → videos del docente indicado.

### `POST /videos/actualizar`

Permite editar título, descripción, UA, identificador (con validación de unicidad) y palabras clave. Al editar, el video vuelve a `aprobado = 0`.

### `POST /videos/eliminar-por-id`

**Body**: `{ "id": 12 }`.

### `GET /videos/en-espera`

Lista videos con `aprobado = 0` incluyendo usuario, UA, carrera y palabras clave. Pensado para el panel de administración.

### `POST /videos/actualizar-estado`

**Body**

```json
{ "id": 12, "aprobado": 2, "comentario": "Audio inaudible" }
```

`aprobado` admite `1` (aprobar) o `2` (rechazar). `comentario` se ignora en aprobaciones.

### `POST /videos/obtener-por-id`

**Body**: `{ "id": 12 }` → detalle completo. Responde `403` si el video no está aprobado.

---

## Esquema de errores

Salvo el listado paginado de videos, los errores siguen la forma:

```json
{ "success": false, "mensaje": "Texto explicativo" }
```

El manejador global de errores responde `500` con `mensaje: "Error interno del servidor"` sin exponer la traza.
