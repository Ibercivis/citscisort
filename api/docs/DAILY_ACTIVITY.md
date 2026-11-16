# Registro de actividad diaria

Implementado 2026-11-16.

## Qué se guarda
Tabla `classifications_dailyactivity`: **una fila por usuario y día** (día natural en
`settings.TIME_ZONE`, Europe/Madrid) en el que el usuario hizo al menos una petición
autenticada. Campos: `user`, `date`, `first_seen_at`. Único por `(user, date)`.
Se borra con la cuenta (`CASCADE`).

No se guarda IP, user-agent ni rutas visitadas.

## Cómo se escribe
`apps/classifications/authentication.py` → `ActivityTokenAuthentication` (sustituye a
`TokenAuthentication` en `REST_FRAMEWORK`). Tras autenticar, `record_daily_activity()`
hace `get_or_create` una vez por usuario y día; una clave de caché (por proceso, 26 h)
evita consultar la base de datos en cada petición. Si el registro falla, se loguea y la
petición sigue (nunca rompe la autenticación).

Solo cuenta quien usa un token válido: quien abre la web sin sesión no queda registrado.

## Cómo se lee
- `GET /api/staff/daily-activity/?days=60` (1–365, por defecto 60). Solo `is_staff`
  (401 sin sesión, 403 si no es staff). Devuelve por día: `active_count` y los usuarios
  (nombre, usuario, clasificaciones de ese día) y `tracking_since`.
- Web: `/staff/activity` ("Daily Activity" en el menú lateral, solo staff). El frontend
  obtiene `is_staff` de `/api/profiles/me/`; el control real está en la API.

## Limitaciones
- No hay histórico anterior al despliegue (`tracking_since`). Los días previos salen a 0.
  No se rellenó con clasificaciones para no mezclar dato real con inferido.
- Una persona que mantiene la sesión abierta se registra con la primera petición del día
  (la app hace polling de notificaciones cada 30 s, así que una pestaña abierta cuenta).

## Privacidad
Nuevo dato personal (cuándo usa cada persona la plataforma). Se añadió a la sección 2 de
la Política de Privacidad (About.jsx). **No se subió `CURRENT_PRIVACY_VERSION`**, así que
los usuarios actuales no han reaceptado el texto nuevo; decisión pendiente de Francisco.

Tests: `python manage.py test apps.classifications.tests.test_daily_activity --settings=config.settings_test`
