# Ideas para aumentar la participación

Banco de ideas, sin priorizar ni implementar. Apuntado el 2026-10-16.
Relacionado: `ENGAGEMENT_EMAILS.md` (política de correos), `ENGAGEMENT_MEASUREMENT_PLAN.md` (cómo medir).

## De Francisco

- **Racha de días seguidos clasificando.** Mostrar "llevas N días seguidos".
- **Clasificaciones del día.** Mostrar "llevas N clasificaciones hoy".

## Notas de viabilidad (míos, por revisar)

- Ambos datos se pueden calcular con `Classification.created_at` y `is_valid`, sin modelos nuevos. Si se muestran en cada página o se usan en correos, convendría cachearlos o guardarlos en `UserProfile`.
- Hay que decidir qué es "un día": la zona horaria del usuario o Europe/Madrid. Las estadísticas actuales usan `TIME_ZONE=Europe/Madrid`, mientras que el envío de correos corre en UTC.
- Hay que decidir si la racha se rompe al saltar un día o si tolera un día de gracia, y si cuenta solo clasificaciones válidas.

## Dónde se podrían usar

- **En la aplicación:** contador visible mientras se clasifica (hoy y racha).
- **En los correos de hito:** añadir "tu mejor racha" o "clasificaciones esta semana".
- **En un aviso de racha en peligro:** correo o aviso en la app si llevas N días seguidos y hoy no has clasificado. Dentro de la política de correos tendría que respetar el cooldown de 7 días o ser un tipo con su propia regla.

## Pendiente de medir

Si se implementa alguna, evaluarla con el grupo de control del plan de medición antes de dar por buena la mejora.
