# Seguridad

Este documento describe las medidas de seguridad implementadas en el backend y las recomendaciones para entornos productivos.

## Contraseñas

### Algoritmo de hash

Se utiliza **bcrypt** (`bcrypt@^6.0.0`). El costo (rondas) es configurable vía variable de entorno:

```
BCRYPT_ROUNDS=12
```

El valor por defecto es `12`, un balance razonable entre seguridad y latencia en hardware moderno. Puede incrementarse si el servidor lo permite.

### Pepper

Adicionalmente a la sal automática de bcrypt, se concatena un **pepper** server-side antes de hashear:

```
PASSWORD_PEPPER="cadena-aleatoria-larga"
```

A diferencia de la sal, el pepper no se guarda en la base de datos: vive únicamente en el entorno. Si un atacante obtiene una copia de la BD pero no del pepper, los hashes siguen siendo resistentes a ataques offline.

> Consideración operativa: cambiar el pepper invalida todos los hashes existentes. Si se activa después del primer despliegue, es necesario reiniciar contraseñas. Se recomienda definirlo antes del primer alta.

### Política de fortaleza

Impuesta en `CapaServicio/seguridad.service.js` mediante `validarPoliticaPassword`. Aplica en:

- `POST /usuarios/crear`
- `POST /usuarios/actualizar` (si `data.password` está presente)

Reglas:

| Regla | Valor |
|---|---|
| Longitud mínima | 8 caracteres |
| Longitud máxima | 72 caracteres (límite efectivo de bcrypt) |
| Debe contener | mayúscula, minúscula, dígito, carácter no alfanumérico |

Las contraseñas que no cumplen devuelven `400` con mensaje explicativo.

### Migración de contraseñas legadas

Algunas cuentas creadas antes de introducir bcrypt están almacenadas en texto plano. El login detecta este caso y migra automáticamente sin intervención del usuario:

```js
if (esHash(usuario.password)) {
    return compararPassword(passwordPlano, usuario.password);
}
const coincide = compararPasswordLegado(passwordPlano, usuario.password);
if (coincide) {
    const nuevoHash = await hashPassword(passwordPlano);
    await UsuarioModelo.Actualizar(usuario.id, { password: nuevoHash });
}
```

La detección se basa en el prefijo `$2` propio de los hashes bcrypt. El re-hash usa las rondas y pepper actuales.

### Fuga de hashes

Ningún endpoint devuelve el campo `password`:

- `Modelo_Usuario.ObtenerTodos` lo omite en el `select` efectivo.
- `Modelo_Usuario.obtenerUsuarioporid` no lo incluye.
- `Control_Usuarios.ActualizarUsuario` sanitiza la respuesta con `sanitizarUsuario`.

El único punto donde se lee el campo es durante la verificación de credenciales (`obtenerPorNombre`, `TraerAdmin`), y se descarta antes de responder.

## Sesiones

- Identificador generado con `crypto.randomBytes(32).toString("hex")`: 256 bits de entropía.
- Persistidas en la tabla `Session` con relación en cascada al usuario.
- El modo `singleSession` elimina sesiones previas al iniciar una nueva, útil para cuentas de administrador.
- El cierre de sesión borra el registro en BD y limpia `localStorage` del lado cliente.

### Limitaciones conocidas

- El `sesionID` viaja en el cuerpo de la petición, no como cookie `HttpOnly`. En escenarios donde se priorice defensa contra XSS conviene migrar a cookies firmadas.
- La función `requireAuth` expuesta en `Controladores/Control_Sesion.js` no está montada actualmente en ninguna ruta. Las rutas administrativas delegan el control de acceso al cliente. Reforzar esto es una mejora pendiente.

## Rate limiting

Provisto por `express-rate-limit` y configurado en `CapaServicio/rateLimit.service.js`:

| Limitador | Ventana | Máximo | Aplicado a |
|---|---|---|---|
| `limitadorGeneral` | 60 s | 120 peticiones / IP | Todas las rutas |
| `limitadorLogin` | 15 min | 10 intentos / IP | `POST /usuarios/login`, `POST /usuarios/validaradmin` |

Al superar el umbral el servidor responde `429 Too Many Requests` con cabeceras estándar `RateLimit-*`.

> Nota: `express-rate-limit` usa el `X-Forwarded-For` sólo si `app.set('trust proxy', …)` está configurado. En despliegues tras un proxy inverso debe ajustarse para no contar todas las peticiones como provenientes de la misma IP.

## Cabeceras HTTP

Se aplica `helmet()` en `app.js`, que activa:

- `Content-Security-Policy` por defecto.
- `Strict-Transport-Security` (requiere HTTPS).
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: SAMEORIGIN`.
- `Referrer-Policy: no-referrer`.
- Otras cabeceras defensivas.

En producción con HTTPS conviene revisar la política CSP si se cargan recursos externos (Bootstrap desde CDN, etc.) y ajustarla para permitirlos.

## CORS

Configurable por entorno:

```
CORS_ORIGINS="https://midominio.edu,https://admin.midominio.edu"
```

Separado por comas. El backend aplica `cors({ origin: origenesPermitidos, credentials: true })`.

En desarrollo el valor por defecto es `http://127.0.0.1:8080`.

## Validación de entrada

Los controladores validan tipos y presencia de los campos críticos (`id` numérico, strings no vacíos, rangos permitidos de `aprobado`, etc.). No existe una librería de validación declarativa (tipo Zod o Joi); introducirla es una mejora razonable si el número de endpoints crece.

## Manejador global de errores

`app.js` registra:

```js
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status ?? 500).json({ success: false, mensaje: "Error interno del servidor" });
});
```

Evita fugas de stack traces hacia el cliente. Los detalles quedan en la salida estándar del servidor.

## Checklist para producción

- [ ] Servir detrás de HTTPS (reverse proxy con certificado válido).
- [ ] Configurar `app.set('trust proxy', 1)` si hay proxy al frente.
- [ ] Definir `PASSWORD_PEPPER` con valor aleatorio largo.
- [ ] Cambiar `CORS_ORIGINS` al dominio real.
- [ ] Actualizar `Cliente/Js/config.js` con la URL pública del backend.
- [ ] Rotar credenciales del administrador inicial tras el primer despliegue.
- [ ] Programar respaldos periódicos del archivo SQLite (o migrar a un motor con soporte nativo de backup).
- [ ] Monitorizar logs en busca de picos de `429`.
