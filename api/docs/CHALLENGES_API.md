# Sistema de Retos / Challenges — Guía para el frontend

> Backend **ya terminado**. No hay que tocarlo. Esta guía describe el modelo
> conceptual, las reglas de participación y todos los endpoints con sus shapes.

## 1. Concepto: un reto es una *lente*, no un silo

Hay **un único corpus** de artículos (~12.855). Un **Reto/Challenge** es simplemente
un **filtro** sobre ese corpus:

- **General** (`challenge_type: "general"`) → todo el corpus.
- **Keyword** (`"keyword"`) → artículos con ese keyword (ej. *COVID-19*).
- **Journal** (`"journal"`) → artículos de esa revista (ej. *PLOS ONE*).
- **WoS Category** (`"wos_category"`) → artículos de esa categoría Web of Science (ej. *Ecology*).

El catálogo es 1 general + top-N keywords + top-N revistas + top-N categorías WoS (por nº de artículos). **N es configurable en backend** (actualmente 50 → ~151 retos). El frontend **no debe asumir un número fijo**: pinta lo que devuelva `GET /api/challenges/`.

**Regla de oro:** una clasificación **cuenta en todos los retos a los que pertenece el
artículo a la vez** (su revista + cada uno de sus keywords + el general). No hay datos
duplicados ni una cola distinta por reto: es el mismo corpus visto por distintas lentes.

## 2. Participación: hay que UNIRSE explícitamente

| Acción | ¿Requiere `join`? |
|---|---|
| Clasificar en la cola de un reto específico (**keyword, revista o WoS category**) (`next_abstract?challenge=`) | ✅ **Sí** (si no, 403 `challenge_join_required`) |
| Clasificar en el **General** (sin `?challenge`) | ❌ No, abierto a todos |
| Que tu clasificación **cuente** en un reto (stats + leaderboard) | ❌ No — cuenta siempre, clasifiques desde donde clasifiques |
| Aparecer en **"Mis retos"** (`/my/`) e `is_participating: true` | ✅ Sí (es el bookmark del join) |

**En una frase:** unirte es el *permiso* para usar la cola acotada de ese reto; pero tu
trabajo en papers de ese reto **suma siempre**, estés unido o no.

## 3. Autenticación

- Header: `Authorization: Token <token>` (igual que el resto de la app).
- Todos los endpoints requieren usuario autenticado **y términos legales aceptados**.
- Si faltan términos → `403 { "code": "legal_acceptance_required", "needs_acceptance": true }`.
  Mostrar el modal de aceptación existente.

Base de todas las rutas: `/api/`

---

## 4. Shapes de datos

### Objeto `Challenge`
```jsonc
{
  "id": 29,
  "challenge_type": "keyword",            // "general" | "keyword" | "journal" | "wos_category"
  "challenge_type_display": "Keyword",
  "title": "COVID-19",
  "slug": "keyword-covid-19",
  "keyword_label": "COVID-19",            // null salvo en type=keyword
  "keyword_slug": "covid-19",             // null salvo en type=keyword
  "wos_category_label": null,             // se rellena en type=wos_category (ej. "Ecology")
  "wos_category_slug": null,              // se rellena en type=wos_category (ej. "ecology")
  "journal_name": "",                      // sólo en type=journal
  "stats": { /* ver abajo */ },
  "is_participating": false                 // ¿el usuario actual se ha unido?
}
```

### Objeto `stats` (dos granularidades)
```jsonc
{
  // nivel ABSTRACT (un abstract se "completa" al alcanzar consenso)
  "total_abstracts": 92,
  "completed_abstracts": 10,
  "in_progress": 82,
  "progress_pct": 10.9,
  "is_completed": false,

  // nivel CLASIFICACIÓN ("hay 460 por hacer, hechas 29")
  "classifications_target": 460,           // Σ required_classifications de los abstracts
  "classifications_done": 29,              // clasificaciones realmente hechas (filas reales)
  "classifications_pct": 6.3,

  // SÓLO en detalle y en /my/ (no en el listado de catálogo)
  "my_contributions": 3                    // clasificaciones del usuario en este reto
}
```

---

## 5. Endpoints

### `GET /api/challenges/` — catálogo
Lista (sin paginar) de todos los retos activos. `stats` aquí es **global** (sin `my_contributions`).
- Query opcional: `?type=general|keyword|journal|wos_category`
- Respuesta: `Challenge[]`

### `GET /api/challenges/{id}/` — detalle
Igual que el objeto Challenge, pero `stats` **incluye `my_contributions`**.

### `POST /api/challenges/{id}/join/` — unirse
Idempotente. `201` si nuevo, `200` si ya estaba.
```json
{ "joined": true, "created": true, "challenge_id": 29, "joined_at": "2026-05-24T..." }
```

### `POST /api/challenges/{id}/leave/` — salir
```json
{ "left": true, "was_participating": true }
```

### `GET /api/challenges/my/` — mis retos
Retos a los que te has unido, con progreso. `challenge.stats` incluye `my_contributions`.
```jsonc
[
  { "id": 7,
    "challenge": { /* objeto Challenge completo */ },
    "joined_at": "2026-05-24T...",
    "last_activity_at": "2026-05-24T..." }   // se actualiza al pedir trabajo del reto
]
```

### `GET /api/challenges/{id}/leaderboard/?limit=10` — ranking
Ranking por nº de clasificaciones hechas en el scope del reto. Privacidad: sólo perfiles
con `is_profile_public=true` muestran nombre; el resto es `"Anonymous"`.
```jsonc
{
  "challenge_id": 29,
  "results": [
    { "rank": 1, "display_name": "Grace Hopper", "institution": "MIT", "is_anonymous": false, "classifications": 5 },
    { "rank": 2, "display_name": "Anonymous",    "institution": null,  "is_anonymous": true,  "classifications": 3 }
  ],
  "my_position": 4,            // posición del usuario actual (o null si 0 clasificaciones)
  "my_classifications": 2
}
```

### `GET /api/classifications/next_abstract/?challenge={id}` — siguiente artículo a clasificar
Devuelve el siguiente abstract a clasificar. **Sin `?challenge`** = pool General (abierto).
**Con `?challenge`** = acotado a ese reto (requiere join salvo en General).

Éxito:
```jsonc
{
  "abstract": { /* AbstractSerializer: id, title, authors, abstract_text, keywords, journal, ... */ },
  "is_training": false,
  "progress": { "current": 2, "required": 5 },
  "challenge": {                                   // sólo si se pasó ?challenge
    "id": 29, "title": "COVID-19", "challenge_type": "keyword",
    "stats": { /* ... incl. my_contributions */ }
  }
}
```

Sin más artículos (reto agotado/completado para ti):
```json
{ "message": "No more abstracts to classify in challenge \"COVID-19\"", "completed": true, "challenge": { } }
```

**Errores importantes:**
- Reto específico (keyword/journal/wos_category) y **no te has unido** → `403`:
  ```json
  { "error": "You must join this challenge before classifying in it",
    "code": "challenge_join_required", "challenge_id": 29 }
  ```
  → Mostrar botón **"Participar"** (`join`) y reintentar. El General nunca devuelve este 403.
- Reto inexistente → `404 { "error": "Challenge not found" }`.

### `POST /api/classifications/` — enviar clasificación (**sin cambios**)
Usa el flujo de envío de clasificación que ya tienes. **No lleva `challenge`**: la
clasificación cuenta automáticamente en el general, su revista y todos sus keywords.

---

## 6. Flujo y pantallas a construir

1. **Catálogo de retos** — `GET /api/challenges/` (filtrable por `type`). Tarjeta por reto:
   `title`, tipo, doble barra de progreso (abstracts: `progress_pct`; clasificaciones:
   `classifications_pct` con `classifications_done`/`classifications_target`), badge si
   `is_completed`, botón **Participar/Salir** según `is_participating`.
2. **Participar / salir** — `POST .../join/` y `POST .../leave/`.
3. **Mis retos** — `GET /api/challenges/my/` (con `my_contributions` y `last_activity_at`).
4. **Detalle de reto** — `GET /api/challenges/{id}/` + **leaderboard**
   `GET /api/challenges/{id}/leaderboard/`.
5. **Clasificar dentro de un reto** — `GET .../next_abstract/?challenge={id}` para pedir
   trabajo (si 403 `challenge_join_required` → ofrecer Participar y reintentar); enviar con
   el `POST /api/classifications/` actual. Si la respuesta trae `completed: true` →
   "reto completado / sin más artículos".
6. **General** = `next_abstract` sin `?challenge` (cola por defecto, sin join).

## 7. Notas / gotchas

- `my_contributions` sólo viene en **detalle** y **/my/**, no en el listado del catálogo.
- El catálogo **no está paginado** (es un conjunto acotado, ~150 retos; no asumir nº fijo).
- Un reto "completado" (`is_completed`) ya no devuelve abstracts en su cola.
- `classifications_done` cuenta clasificaciones reales; puede haber retos con `done > 0`
  pero `completed_abstracts = 0` (hay trabajo hecho pero ningún abstract ha llegado aún a
  consenso). Es correcto: son dos barras distintas.
- No cambies el backend; respeta el design system y la capa de fetch ya existentes.
