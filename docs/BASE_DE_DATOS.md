# Base de datos

La persistencia se gestiona con **Prisma** sobre **SQLite**. El archivo físico es `prisma/dev.db` y la definición del esquema vive en `prisma/schema.prisma`.

SQLite fue elegido por sencillez de despliegue y volumen de datos acotado. Para migrar a PostgreSQL o MySQL basta cambiar `provider` y `DATABASE_URL` en el `.env`; el resto del código no depende del motor.

## Modelo de dominio

```
Facultad 1───* Carrera 1───* UA 1───* Video *───* PalabraClave
                                         │
                                         *
                                         │
                                      Usuario 1───* Session
Usuario *───1 Facultad
```

Relaciones destacadas:

- Un **Usuario** pertenece a lo sumo a una **Facultad**. El sistema impone que cada facultad tenga un único docente asignado (`crearUsuario` valida `Count(facultad) === 0`).
- Cada **Carrera** pertenece a una **Facultad**; cada **UA** pertenece a una **Carrera**.
- Cada **Video** es propiedad de un **Usuario** y pertenece a una **UA**. La relación con **PalabraClave** es *many-to-many* a través de `VideoPalabraClave`.
- Cada **Session** pertenece a un **Usuario** y se elimina en cascada si el usuario se borra.

## Entidades

### Usuario

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int | PK autoincremental |
| `nombre_de_usuario` | String | `@unique` |
| `password` | String | Hash bcrypt (histórico: texto plano migrable) |
| `fecha_de_registro` | DateTime | `default(now())` |
| `admin` | Boolean | |
| `baja` | Boolean? | `true` deshabilita el login |
| `facultad_id` | Int? | FK opcional |

### Session

| Campo | Tipo | Notas |
|---|---|---|
| `id` | String | PK; hex de 64 caracteres generado con `crypto.randomBytes(32)` |
| `usuarioId` | Int | FK con `onDelete: Cascade` |
| `createdAt` | DateTime | `default(now())` |

Índice secundario por `usuarioId` para consultas rápidas durante la validación de sesión.

### Facultad

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int | PK |
| `nombre` | String | `@unique` |

### Carrera

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int | PK |
| `nombre` | String | `@unique` |
| `facultad_id` | Int | FK |

### UA

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int | PK |
| `nombre` | String | |
| `modalidad` | String | |
| `carrera_id` | Int | FK |

### Video

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int | PK |
| `titulo` | String | |
| `descripcion` | String | |
| `identificador` | String | `@unique` (típicamente id de YouTube) |
| `fecha_de_registro` | DateTime | `default(now())` |
| `fase` | String | |
| `aprobado` | Int | `0` en espera, `1` aprobado, `2` rechazado |
| `comentario` | String? | Motivo de rechazo |
| `usuario_id` | Int | FK |
| `ua_id` | Int | FK |

### PalabraClave

| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int | PK |
| `nombre` | String | `@unique` |

### VideoPalabraClave

Tabla de relación N:M entre `Video` y `PalabraClave`.

| Campo | Tipo | Notas |
|---|---|---|
| `video_id` | Int | FK, `onDelete: Cascade` |
| `palabra_clave_id` | Int | FK, `onDelete: Restrict` |

Clave primaria compuesta `(video_id, palabra_clave_id)` e índices por ambas columnas.

## Migraciones

El historial se guarda en `prisma/migrations/`. Comandos habituales:

```bash
# aplicar migraciones existentes (desarrollo)
npx prisma migrate dev

# crear una nueva migración a partir de cambios en schema.prisma
npx prisma migrate dev --name descripcion_del_cambio

# regenerar el cliente (tras cambios en el schema)
npx prisma generate

# abrir un explorador interactivo de la BD
npx prisma studio
```

El cliente generado se deposita en `generated/prisma/` (ruta configurada con `output` en `schema.prisma`). No debe editarse manualmente.

## Sembrado inicial

No hay un script de seed. El administrador inicial debe crearse manualmente desde Prisma Studio o con un INSERT directo:

```sql
INSERT INTO Usuario (nombre_de_usuario, password, admin, fecha_de_registro)
VALUES ('admin', 'claveProvisional', 1, CURRENT_TIMESTAMP);
```

En el primer login esa contraseña se reemplazará automáticamente por un hash bcrypt (ver `docs/SEGURIDAD.md`).

## Mantenimiento recomendado

- **Sesiones caducas**: no hay limpieza automática. Tarea sugerida (pendiente): job que borre registros de `Session` con `createdAt` mayor a 7 días.
- **Respaldo**: al ser SQLite, basta copiar `prisma/dev.db` para tener un backup completo.
