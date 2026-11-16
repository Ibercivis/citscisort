# Plan: medir el éxito de los correos de engagement

Estado: **plan acordado el 2026-10-16, sin implementar.**
Relacionado: `ENGAGEMENT_EMAILS.md` (política de envío), TODO de rebotes/quejas de SES.

## Por qué

El primer lote (2026-10-09, 101 correos) no muestra efecto: 0 de 92 destinatarios de
reenganche volvieron a clasificar en 7 días. Hoy no podemos distinguir entre
"el correo no funciona", "no llegó" o "es el público". El único dato que guardamos
es que SES *aceptó* el mensaje (`EngagementEmail.status = sent`).

## Qué medimos

| Capa | Pregunta | Métricas |
|---|---|---|
| Entrega | ¿Llegó? | entregados / enviados, rebotes (< ~5 %), quejas (< ~0,1 %) |
| Respuesta | ¿Hizo clic y volvió? | clics / enviados, **volvieron a clasificar en 7 días / enviados**, clasificaciones aportadas, bajas / enviados |
| Causalidad | ¿Fue el correo? | tasa de regreso del grupo enviado vs. grupo de control |

Las aperturas se registran pero **no** son métrica de éxito (precarga de imágenes en Apple Mail y Gmail).

## Fases (en este orden)

### 1. Eventos de SES (entrega y reputación)
- Crear una configuration set en SES con eventos Send, Delivery, Bounce, Complaint, Open y Click, publicados en un topic SNS.
- Endpoint webhook (o django-ses) que reciba los eventos y los guarde en la base de datos, ligados a `EngagementEmail` (modelo nuevo `EngagementEmailEvent`: email, tipo de evento, fecha, payload).
- Rellenar `AWS_SES_CONFIGURATION_SET` en `.env`.
- Suprimir envíos futuros a direcciones con rebote duro o queja, con el motivo en las razones de omisión de `engagement.py`.
- Cierra el TODO de rebotes de SES.

### 2. Seguimiento de clics y regreso
- Enlace del correo con token propio por envío (y `utm_*`), que registra el clic y redirige.
- Registrar la primera visita y la primera clasificación posterior ligadas al envío.
- Atribución: ventana de 7 días desde el envío.

### 3. Grupo de control (holdout)
- Decidido por Francisco: se acepta dejar sin correo a una parte de los elegibles.
- En cada tanda, un porcentaje de los elegibles se aparta al azar. **Propuesta: 15 %, a confirmar** (parámetro `HOLDOUT_PCT` en `ENGAGEMENT_EMAILS`).
- Se registra en la base de datos (fila de `EngagementEmail` con estado de omisión `holdout`, o campo `holdout=True`) para tener audit trail.
- Asignación determinista por usuario y dedupe_key (hash), para que no cambie entre ejecuciones.
- Aplicar a partir del segundo intento de reenganche (nov-2026) y a las altas nuevas; no a los hitos.
- Comparar tasa de regreso en 7 días entre enviados y control.

### 4. Panel de resultados
- Vista en el admin o endpoint con, por tipo de correo e intento: elegibles, enviados, entregados, rebotes, quejas, clics, regresos en 7 días, clasificaciones aportadas, bajas y control.

## Fechas a tener en cuenta
- Segundo intento de los lapsed del lote del 9-oct: ~2026-11-09 (42 personas).
- Segundo intento de los que nunca clasificaron: ~2026-11-16 (50 personas).
- Idealmente las fases 1 a 3 estarían listas antes del 2026-11-09.

## Pendiente fuera de código
- Revisar el panel de reputación de SES tras el lote del 9-oct (lo hace Francisco).
- Redis sin persistencia (`appendonly no`): si se reinicia, hay que volver a lanzar
  `manage.py schedule_engagement_emails`. Opción: añadirlo a `deploy.sh`.
