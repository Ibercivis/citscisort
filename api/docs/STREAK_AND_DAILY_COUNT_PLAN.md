# Plan: racha de días y clasificaciones del día

Estado: **plan, sin implementar.** Pedido por Francisco el 2026-10-16 (ver `ENGAGEMENT_IDEAS.md`).

## Qué existe hoy

- `GET /api/stats/me/` (`MyStatsView`, `views.py`) ya devuelve `overview.classifications_today`, `_this_week` y `_this_month`.
  - Se muestran en `react-code/src/pages/MyStats.jsx` (tarjeta "Today") y en el panel de `components/dashboard/MainGrid.jsx` (chip "Today").
  - **Problema:** `today = timezone.now().date()` es la fecha UTC, no la de Madrid. Entre las 00:00 y las 02:00 de Madrid cuenta el día anterior.
- **No existe la racha**: ni modelo, ni campo, ni cálculo.
- La página de clasificar (`pages/Classify.jsx`, formulario en `components/ClassificationForm.jsx`) **no muestra ningún contador**.
- **Entre tarea y tarea ya hay una pantalla:** al enviar, `ClassificationForm.handleSubmit` pasa a estado `submitted`, muestra "Classification submitted successfully!" y las clasificaciones de otros sobre ese resumen, y espera a que la persona pulse "Siguiente" (`handleNext` → `onSuccess` → `loadNextAbstract`). Es el momento natural para el contador.
- `POST /api/classifications/` (`views.py:423`) devuelve la clasificación creada, sin datos de actividad.
- Los correos de hito reciben el contexto de `engagement.build_context` (solo `user_classifications` y datos de la comunidad).

## Dónde se vería cada una

| | Clasificar (`/classify`) | Panel (`MainGrid`) | Mis estadísticas (`MyStats`) | Correo de hito |
|---|---|---|---|---|
| **Hoy: N clasificaciones** | **Sí, principal: en la pantalla de después de enviar** (entre tarea y tarea), junto al botón "Siguiente". Opcional: chip pequeño fijo mientras se clasifica | Ya existe (se corrige la zona horaria) | Ya existe | No |
| **Racha: N días** | **Sí**, en la misma pantalla de después de enviar, junto al "Hoy" | Nuevo chip | Nueva tarjeta con racha actual y mejor racha | Opcional: "tu mejor racha" |

El sitio clave es la pantalla posterior al envío: el número acaba de cambiar y la persona está decidiendo si sigue. Ejemplo: "¡Guardada! Llevas 7 hoy · racha de 3 días" y el botón "Siguiente" justo debajo.

## Diseño

### Backend
1. Módulo nuevo `apps/classifications/activity.py` con `activity_summary(user, now=None)`:
   - Devuelve `today`, `streak_days`, `best_streak_days` y `streak_alive_until` (fecha límite para mantener la racha).
   - Se calcula con las fechas distintas de `Classification.created_at` convertidas a `Europe/Madrid` (`TruncDate(..., tzinfo=...)`), sin modelos nuevos.
   - La racha son días consecutivos terminando hoy. Si hoy aún no ha clasificado pero sí ayer, la racha **sigue viva** (no vale 0 hasta que acabe el día).
2. **Qué cuenta:** propuesta, `is_valid=True` y `is_training=False`. Hoy `classifications_today` cuenta todas, así que hay que unificar el criterio.
3. **Exponerlo:**
   - Añadir `streak_days`, `best_streak_days` a `overview` en `/api/stats/me/` y corregir `today` a hora de Madrid.
   - Añadir `activity` (`today`, `streak_days`) a la respuesta de `POST /api/classifications/`, para actualizar el contador sin una petición extra.
4. Tests en `apps/classifications/tests/`: racha con huecos, cambio de día en torno a medianoche de Madrid, cambio de hora (DST), racha viva con hoy sin clasificar, y usuarios sin clasificaciones.

### Frontend
1. `services/abstractService.js`: pasar `activity` de la respuesta de `submitClassification`.
2. `ClassificationForm.jsx`: guardar `activity` de la respuesta del envío y mostrarlo en el bloque `submitted`, sustituyendo o acompañando al mensaje de éxito actual. No requiere petición extra ni estado en `Classify.jsx`.
3. Cuando la racha sube (primera clasificación del día), una línea destacada: "¡Racha de N días!". Sin confeti ni bloquear el flujo.
4. Opcional, segunda fase: chip fijo "Hoy: N" en `Classify.jsx`, inicializado con `getMyStats()` y actualizado desde el envío, por si se quiere ver el contador mientras se clasifica.
5. `MainGrid.jsx` y `MyStats.jsx`: añadir racha y mejor racha.

### Correos (fase aparte)
- Añadir `streak_days` y `best_streak_days` al contexto de `build_context` y una línea opcional en la plantilla de hito.
- "Racha en peligro" sería un tipo de correo nuevo con su propia regla y su exclusión del cooldown de 7 días. **No incluido en esta primera versión.**

## Decisiones por tomar

1. ¿Cuenta la clasificación de entrenamiento para la racha? (Propuesta: no.)
2. ¿Día de gracia? (Propuesta: sin gracia al inicio; valorar una "congelación" semanal después.)
3. Zona horaria: Europe/Madrid para todos (Propuesta) o la del navegador del usuario.
4. ¿Mostrar el aviso de racha también a quien tiene racha 1? (Propuesta: sí, desde 2 días.)

## Orden de trabajo

1. Backend: `activity.py` + tests + corrección de zona horaria de `today`.
2. Exponer en `/api/stats/me/` y en la respuesta del POST.
3. Frontend: chips en Classify, luego MainGrid y MyStats.
4. **Decidido (2026-10-16): se activa para todos, sin bandera por grupos.** Medición solo antes/después, sin control: comparar clasificaciones por usuario activo, días activos por semana y regreso a 7 días en las semanas previas y posteriores al lanzamiento. Es una comparación temporal, no causal (el pico del 9-oct muestra cuánto varía la actividad por otras causas), así que las conclusiones serán orientativas.
5. Correos: contexto de racha en hitos; "racha en peligro" solo si los datos lo justifican.
