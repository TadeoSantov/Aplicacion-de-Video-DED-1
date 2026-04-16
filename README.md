# Aplicación de Video DED

Plataforma web para la gestión y difusión de videos académicos organizados por Facultad, Carrera y Unidad de Aprendizaje (UA). Los docentes publican contenidos que un administrador revisa y aprueba antes de que queden visibles para los estudiantes.

Este repositorio contiene tanto el **backend** (API REST en Node.js + Express + Prisma) como el **cliente** (HTML/CSS/Bootstrap + JavaScript modular que consume la API).

---

## Índice

1. [Características](#características)
2. [Stack tecnológico](#stack-tecnológico)
3. [Estructura del repositorio](#estructura-del-repositorio)
4. [Requisitos](#requisitos)
5. [Puesta en marcha](#puesta-en-marcha)
6. [Variables de entorno](#variables-de-entorno)
7. [Documentación extendida](#documentación-extendida)
8. [Convenciones](#convenciones)
9. [Autoría](#autoría)

---

## Características

- Autenticación con contraseñas hasheadas (`bcrypt`) y migración transparente de credenciales heredadas en texto plano.
- Gestión de sesiones persistidas en base de datos (single-session opcional).
- Catálogo jerárquico: `Facultad → Carrera → UA → Video`.
- Sistema de palabras clave (tags) aplicable a cada video.
- Flujo de aprobación: los videos nacen en estado *en espera*; un administrador los aprueba o rechaza con comentario.
- Listado público con paginación, búsqueda por texto, filtros por facultad/carrera/UA/palabras clave/fechas y ordenamiento configurable.
- Endurecimiento de la API: `helmet`, `express-rate-limit` (login y general), CORS configurable, manejador global de errores.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 22 |
| Framework HTTP | Express 5 |
| ORM | Prisma 6 |
| Base de datos | SQLite (archivo `prisma/dev.db`) |
| Seguridad | bcrypt, helmet, express-rate-limit, dotenv |
| Frontend | HTML5, Bootstrap 5, JavaScript ES Modules |

Versiones de referencia verificadas: Node 22.17.0, npm 10.9.2, Prisma 6.11.1, Express 5.1.0, SQLite 3.46.0.

## Estructura del repositorio

```
Aplicacion-de-Video-DED/
├── app.js                       Configuración de Express (middlewares, rutas, errores)
├── server.js                    Punto de entrada (carga .env y levanta el servidor)
├── package.json
├── .env                         Variables de entorno (no versionable en producción)
│
├── prisma/
│   ├── schema.prisma            Definición del modelo de datos
│   ├── migrations/              Historial de migraciones
│   └── dev.db                   Base SQLite local
│
├── Rutas/                       Enrutadores Express por recurso
├── Controladores/               Lógica HTTP: validación, orquestación, respuesta
├── Modelos/                     Acceso a datos vía Prisma
├── CapaServicio/                Lógica compartida entre varios modelos/controladores
│
├── generated/prisma/            Cliente Prisma generado (no editar a mano)
│
└── Cliente/
    ├── Html/                    Vistas
    ├── Css/                     Hojas de estilo
    ├── Js/
    │   ├── config.js            URL base de la API
    │   ├── Fetch_*.js           Llamadas HTTP a los endpoints
    │   └── *.js                 Lógica de UI, validaciones, render
    └── Recursos/                Imágenes y estáticos
```

El patrón seguido es **MVC** con una capa de servicio opcional:

```
Cliente (HTML/JS) ──► Fetch ──► Ruta ──► Controlador ──► [Servicio] ──► Modelo ──► Prisma ──► SQLite
```

## Requisitos

- Node.js ≥ 20 (probado con 22.17.0).
- npm 10+.
- Un servidor estático para servir la carpeta `Cliente/` en `http://127.0.0.1:8080` (recomendado `http-server`). **No se recomienda** Live Server porque recarga formularios al guardar.

## Puesta en marcha

### 1. Clonar e instalar

```bash
git clone https://github.com/tiolax/Aplicacion-de-Video-DED.git
cd Aplicacion-de-Video-DED
npm install
```

### 2. Generar el cliente de Prisma y aplicar migraciones

```bash
npx prisma migrate dev
npx prisma generate
```

Esto crea `prisma/dev.db` si no existe y genera el cliente en `generated/prisma/`.

### 3. Levantar el backend

```bash
node server.js
```

Por defecto escucha en `http://localhost:3002`.

### 4. Levantar el cliente

Desde otra terminal, en la raíz del repositorio:

```bash
npx http-server -p 8080
```

Abre `http://127.0.0.1:8080/Cliente/Html/Login.html`.

### 5. Crear el administrador inicial

No hay seed automático. Puede insertarse directamente desde Prisma Studio:

```bash
npx prisma studio
```

Crea un registro en `Usuario` con `admin = true`, una contraseña provisional y asígnalo a una facultad. En el primer login el sistema convertirá la contraseña a hash automáticamente si fue insertada en texto plano.

## Variables de entorno

Definidas en el archivo `.env`. Se cargan en tiempo de arranque mediante `dotenv`.

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión de Prisma | `file:./dev.db` |
| `PORT` | Puerto del backend | `3002` |
| `BCRYPT_ROUNDS` | Rondas de bcrypt al hashear contraseñas | `12` |
| `PASSWORD_PEPPER` | Secreto server-side añadido antes del hash | `""` (vacío) |
| `CORS_ORIGINS` | Lista separada por comas de orígenes permitidos | `http://127.0.0.1:8080` |

> Activar `PASSWORD_PEPPER` después de tener usuarios existentes invalidará sus hashes. Defínelo antes del primer registro o planifica un reinicio de contraseñas.

## Documentación extendida

| Documento | Contenido |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Capas, flujo de peticiones, convenciones de nombres |
| [`docs/API.md`](docs/API.md) | Referencia completa de endpoints REST |
| [`docs/BASE_DE_DATOS.md`](docs/BASE_DE_DATOS.md) | Modelo Prisma, relaciones y decisiones de diseño |
| [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) | Hashing, política de contraseñas, rate limiting, CORS, migración legacy |
| [`docs/DESARROLLO.md`](docs/DESARROLLO.md) | Flujo de trabajo, scripts, extensiones recomendadas, pendientes |

## Convenciones

- Rutas en castellano, en plural, montadas en `app.js`: `/usuarios`, `/facultades`, `/carreras`, `/UAs`, `/videos`, `/palabras`, `/sessions`.
- Los controladores **no** acceden a Prisma: delegan en los modelos.
- Todas las respuestas JSON incluyen el campo booleano `success` salvo el listado paginado de videos, que sigue un formato `data/meta/links`.
- Los nombres de facultad, carrera, UA y palabras clave se almacenan en minúsculas y se capitalizan al presentar (`capitalizarTitulo`).

## Autoría

Proyecto desarrollado por **Carlos Gómez (Lax)** — [@tiolax](https://github.com/tiolax).

Licencia: ISC.
