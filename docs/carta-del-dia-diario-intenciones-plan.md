# Carta de hoy · Diario de Anclas — plan de implementación (backend + frontend)

Estado: borrador para revisión

## Por qué este archivo vive acá

La feature cruza los dos repos, pero la pieza que **bloquea** todo lo demás
(sin ella el frontend no tiene nada server-first para hidratar) es la
migración SQL + los endpoints nuevos en `rituales-backend`. Sigue el
precedente ya existente de `rituales-backend/docs/ux-wtp-voz-guiada-bloqueante.md`
(spec de UI guardada en este repo aunque el código a tocar sea de
`rituales-app`). Este documento es el input directo para `mvp-builder`, en
ambos repos, en el orden descripto en la sección 6.

Fuentes leídas antes de escribir esto (no se repite su contenido, solo se
referencia):
- `rituales-app/docs/ux-carta-del-dia-diario-intenciones.md` — spec de UX completa, mecánica de mazo, copy, estados, tabla de 8 momentos sin nombres de evento.
- `rituales-app/docs/iteracion-flujo-completo-septiembre-2026.md`, sección 3.3 (líneas 222-379) — decisión de negocio original (tabla nueva, backend como fuente de verdad, borrador anónimo).
- Código real: `rituales-app/src/app/pages/Home.tsx` (implementación parcial sin commitear), `rituales-app/src/app/lib/daily-anchor.ts`, `anchor-service.ts`, `analytics.ts`, `ritual-service.ts`, `UserContext.tsx`; `rituales-backend/src/routes/me.js`, `src/lib/auth.js`, `src/lib/claude.js`, `supabase/schema.sql`, `src/index.js`, `src/routes/events.js`.

## Confirmación de la sección 3.3 del plan grande

Sigue siendo válida en su totalidad, con dos precisiones que agrega este
documento (no la contradicen, la completan porque esa sección dejaba el
contrato de API en un nivel de detalle insuficiente para implementar sin
volver a preguntar):

1. **El endpoint de creación necesita ser "get-or-create", no un POST que
   pueda fallar por conflicto.** El caso "ya existe una carta hoy" no es un
   error — es el camino más frecuente (cada vez que alguien reabre la app el
   mismo día). Se detalla en la sección 2.
2. **Hace falta separar "crear la carta" de "guardar el sentimiento".** La
   especificación de UX (que la 3.3 no tenía cuando se escribió) fija que el
   mazo se elige y el texto se revela *antes* de mostrar el `MoodPicker` — y
   ese momento de elección ya tiene que quedar persistido ("una vez elegida,
   esa elección queda fija", UX spec sección a) aunque la persona cierre la
   app antes de reaccionar con un sentimiento. Con un único endpoint que
   exige `feeling` para crear la fila (como sugería el sketch original) no se
   puede cubrir el estado "carta revelada, reacción pendiente" al recargar.
   Por eso el contrato final es `GET` + `POST` (crea sin `feeling`) + `PATCH`
   (agrega/actualiza `feeling`), no solo `GET`+`POST`.

Nada del resto de 3.3.3 cambia: tabla nueva y versionada, backend como fuente
de verdad, sin acceso directo a Supabase desde el frontend, borrador local
solo para usuarios anónimos, sync al loguearse.

## Objetivo de esta ronda

Que el paso `Inicio` del Diario de Anclas deje de ser una animación de flip
sin propósito explicado (bugs #18/#26 del feedback) y pase a ser la mecánica
de mazo + revelado progresivo ya especificada en UX, con persistencia real
server-side (una carta por usuario por día, verificada en DB) y ocho eventos
de analítica instrumentados en el funnel completo.

## Alcance

- Tabla `daily_intention_cards` en `rituales-backend/supabase/schema.sql`.
- Tres endpoints nuevos bajo `/api/me` en `rituales-backend`.
- Reescritura de la interacción del paso `Inicio` en `Home.tsx` según la spec
  de UX (mazo de 3, flip, revelado por tramos, `prefers-reduced-motion`,
  copy nuevo de `STEP_COPY.inicio`, `MoodPicker` gateado).
- Fix de los 2 bugs de estado (`catch` faltante, hidratación desde
  persistencia real).
- 8 eventos de analítica nombrados y disparados.
- Mecanismo de sync del borrador local anónimo al loguearse.
- Actualización de `guidelines/BackendContract.md` (rituales-app) y de la
  tabla de localStorage keys de `CLAUDE.md` (rituales-app).

## Fuera de alcance de esta ronda

- `Momento` y `Cierre` del Diario de Anclas — siguen sobre
  `daily_anchor_entries` / `anchor-service.ts`, sin cambios (3.3.4).
- Migrar `daily_anchor_entries` a un patrón backend-first o agregarla a
  `schema.sql` — deuda ya señalada en el plan grande, no se toca acá.
- Activar RLS en el resto de las tablas del proyecto (`rituals`,
  `ritual_favorites`, `ritual_likes`, `events`) — sigue pendiente como
  iniciativa aparte. Ver nota de RLS en la sección 1: esta tabla nueva sí
  lleva RLS, pero eso no es una activación general del proyecto.
- Ajustar el prompt de `reframeIntention` (nota "e" de la spec de UX,
  insight #17) — queda anotado para quien lo toque después, no es parte de
  esta implementación.
- La abstracción genérica de "sync de cualquier draft local al loguearse"
  para la sección 11.3 (perfil) — no se construye ahora porque esa feature
  todavía no existe; se deja el call site estructurado para que agregarla
  después sea una línea, no un refactor (ver sección 4).
- Vista histórica de cartas pasadas más allá de lo que ya soporta
  `GET /me/daily-card?date=` (el endpoint no restringe fechas pasadas, pero
  no se construye ninguna UI nueva de "historial de cartas" en esta ronda).

---

## 1. Migración SQL

Agregar a `rituales-backend/supabase/schema.sql`, siguiendo el mismo estilo
que las tablas existentes (bloque `create table if not exists` + índices al
final del archivo, junto a los índices de `rituals`/`ritual_favorites`):

```sql
-- Carta de intención diaria (paso "Inicio" del Diario de Anclas)
create table if not exists daily_intention_cards (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz default now(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  date_key       text not null,
  intention_text text not null,
  feeling        text,
  unique (user_id, date_key)
);

create index if not exists daily_intention_cards_user_id_idx on daily_intention_cards(user_id);
create index if not exists daily_intention_cards_date_key_idx on daily_intention_cards(date_key);
```

Campos confirmados contra el sketch de 3.3.3, con un ajuste: `user_id` es
`not null` (a diferencia de `rituals.user_id`, que es nullable porque permite
rituales anónimos) — acá no tiene sentido una fila sin usuario, porque el
propio requisito de negocio ("una por día, verificado en servidor") solo
aplica con usuario real; los intentos anónimos nunca llegan a esta tabla
(quedan en `localStorage`, ver sección 4). `date_key` es `text` en formato
`YYYY-MM-DD`, mismo formato que ya usa `daily-anchor.ts` en el frontend
(`getDateKey`) y que ya asume el comentario de esquema de
`anchor-service.ts` para `daily_anchor_entries`.

**Nota sobre RLS (señalado explícitamente porque toca datos reales de
usuarios — diario personal, no un dato trivial):** hoy ninguna tabla del
proyecto tiene RLS activa (`rituals`, `ritual_favorites`, `ritual_likes`,
`events` no la tienen; `CLAUDE.md` la marca como "pendiente de activación").
Para esta tabla nueva, la recomendación concreta es **sí activarla**, con
policy `auth.uid() = user_id` para todas las operaciones:

```sql
alter table daily_intention_cards enable row level security;

create policy "Users manage their own daily intention card"
  on daily_intention_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Razón: el backend siempre usa `SUPABASE_SERVICE_ROLE_KEY`, que ignora RLS —
activarla acá no cambia ningún comportamiento actual ni exige tocar código
existente (a diferencia de activarla en las tablas viejas, que sí podría
romper accesos existentes sin auditar primero). Es una capa de seguridad
gratis para una tabla que además guarda contenido personal (texto de diario)
y que, a futuro, podría tentar un fallback de lectura directa desde el
frontend con la anon key (mismo patrón que `getRitualById`) — si eso pasara
sin RLS, cualquier usuario logueado podría leer la carta de cualquier otro.
Esto **no** es una activación general del proyecto ni implica tocar las
tablas existentes — queda contenido a esta tabla nueva. Si Mariana prefiere
no activarla ahora para no introducir la primera tabla con RLS mientras el
resto no la tiene, es un cambio de una línea (borrar el `alter table` y el
`create policy`) — se deja marcado como recomendación, no como bloqueante.

---

## 2. Contrato de los endpoints nuevos

Nuevo router o extensión de `rituales-backend/src/routes/me.js` (mismo
archivo que ya tiene `/dashboard` y `/profile`, montado bajo `/api/me` en
`src/index.js`). Todas las rutas usan `requireUser` (no
`getAuthenticatedUser` opcional) — a diferencia de `rituals/create`, acá no
tiene sentido una versión anónima del lado del servidor: la garantía de "una
por día" solo existe con usuario real (mismo criterio que ya distingue
`auth.js`). Sumar un helper de shaping nuevo,
`rituales-backend/src/lib/daily-intention-cards.js`, con una función
`mapDailyIntentionCardRow(row)` que sigue el mismo patrón que
`mapRitualRow` en `src/lib/rituals.js` (traduce snake_case de la fila a
camelCase de la respuesta):

```js
{
  dateKey: row.date_key,
  intentionText: row.intention_text,
  feeling: row.feeling,
  createdAt: row.created_at,
}
```

Validación compartida por las tres rutas: `dateKey` debe matchear
`/^\d{4}-\d{2}-\d{2}$/` → si no, `400 { "error": "Fecha inválida." }`. El
`dateKey` **siempre lo manda el cliente** (nunca se infiere del reloj del
servidor) — mismo criterio ya usado por `saveDailyAnchorEntry` en el
frontend, porque el día calendario relevante es el del huso horario del
usuario, no el de Vercel.

### `GET /api/me/daily-card?date=YYYY-MM-DD`

- `date` es **requerido** en query string. Sin él, `400`.
- Busca `daily_intention_cards` por `(user_id = req.user.id, date_key = date)`.
- Si no existe fila: `200 { "card": null }` (ausencia es un estado normal —
  "Vacío" o "Mazo visible" en la spec de UX — no es un 404).
- Si existe: `200 { "card": { dateKey, intentionText, feeling, createdAt } }`.
- No restringe fechas pasadas — sirve igual para revisar un día anterior
  (aunque esta ronda no construye una UI nueva para eso).

### `POST /api/me/daily-card`

Body:
```json
{ "dateKey": "2026-09-05", "intentionText": "...", "feeling": "tranquilo" }
```
`feeling` es **opcional** en este endpoint (puede omitirse o venir `null`) —
esto es lo que permite crear la fila apenas se elige una carta del mazo,
antes de que la persona reaccione con un sentimiento.

**Semántica "get-or-create", no "create-or-fail":**
1. Si no existe fila para `(user_id, dateKey)`: inserta con
   `intention_text = intentionText`, `feeling = feeling ?? null`. Responde
   `201 { "card": {...}, "created": true }`.
2. Si ya existe fila para ese `dateKey` (típicamente: la persona ya reveló
   su carta hoy, en esta sesión o en otro dispositivo): **no se sobreescribe
   nada** — ni `intentionText` ni `feeling` — y se responde
   `200 { "card": {...fila existente...}, "created": false }`.

Por qué no un `409`: "ya existe una carta para hoy" es el camino **esperado
y frecuente** (cada vez que alguien reabre la app el mismo día, o si el mazo
se dispara dos veces por un doble-tap), no una condición excepcional. Forzar
al frontend a un `try/catch` con manejo de error para el caso normal
reproduciría el mismo patrón de "error invisible" que esta tarea busca
evitar en otro lado (bug #1). El campo `created: false` es la señal —
observable y sin romper el flujo — de que el frontend tiene que **descartar
su texto local en memoria y usar el `card.intentionText` del servidor como
canónico** (importante para el caso multi-dispositivo: si ya elegiste una
carta en el teléfono, abrir la app en otro dispositivo el mismo día no puede
generar una segunda carta distinta).

Implementación sugerida (no bloqueante, dos formas válidas, decide
`mvp-builder`): `insert().select()` capturando el error de violación del
constraint único (Postgres `23505`) y haciendo un `select` de respaldo: o
directamente `upsert(..., { onConflict: "user_id,date_key", ignoreDuplicates: true })`
seguido de un `select` para devolver la fila resultante (exista ya o recién
creada) — el segundo enfoque es más corto y evita manejar el código de error
a mano.

Validación: `intentionText` vacío/ausente → `400`.

### `PATCH /api/me/daily-card`

Body:
```json
{ "dateKey": "2026-09-05", "feeling": "tranquilo" }
```
- Actualiza `feeling` en la fila existente de `(user_id, dateKey)`.
- **No permite tocar `intentionText`** — es inmutable después de creada
  (refuerza "no se puede volver a tirar la carta" de la spec de UX).
- Si no existe fila todavía para ese `dateKey`: `404 { "error": "Todavía no elegiste tu carta de hoy." }`
  (no debería pasar en el flujo normal, porque el `POST` siempre corre antes
  al elegir carta del mazo — es un guard, no un camino esperado).
- Éxito: `200 { "card": {...actualizada...} }`.

Se eligió `PATCH` en vez de forzar todo por el `POST` porque ya es el patrón
idiomático que usa este mismo router para actualizaciones parciales
(`PATCH /me/profile`), y porque separar "crear" de "reaccionar" hace que
cada endpoint tenga una sola responsabilidad y sea más fácil de razonar en
el frontend (POST se llama una vez, al elegir carta; PATCH se llama una vez,
al guardar el sentimiento).

### Documentación

Agregar una sección nueva `## GET/POST/PATCH /me/daily-card` a
`rituales-app/guidelines/BackendContract.md`, con los mismos tres bloques de
arriba (request/response de ejemplo). Nota aparte: ese archivo hoy **no
documenta ningún endpoint de `/me`** (ni `/dashboard`, ni `/profile`, ni
favorite/like), a pesar de que `CLAUDE.md` sí los lista — es un gap
preexistente del archivo de contrato, no algo que introduce esta tarea. No
hace falta backfillear todo `/me` en esta ronda, alcanza con agregar la
sección nueva de `daily-card` sin tocar el resto del documento.

---

## 3. Eventos de analítica (8 momentos)

Todos con prefijo `home_daily_card_`, siguiendo la convención ya en uso en
`Home.tsx` (`home_create_ritual_tapped`, `home_voice_anchor_used`,
`home_explore_tapped`, `home_recommendation_tapped` — todas con prefijo
`home_` por vivir en esa pantalla). `track()` ya agrega `path`/`ts`/sesión —
no repetir eso en `props`.

| # | Momento (spec UX) | Evento | Props | Nota |
|---|---|---|---|---|
| 1 | Input capturado | `home_voice_anchor_used` (**ya existe, se extiende, no se renombra**) | `wordCount` (palabras del transcript), `isFirstEver` (boolean) | Se sigue disparando en `recognition.onend` con transcript no vacío. |
| 2 | Reencuadre resuelto (éxito o fallo, mismo momento del código) | `home_daily_card_reframe_resolved` | `outcome: "success" \| "error"`, `durationMs`, `attempt` (1, 2, 3... según reintentos); si `success`: `usedFallbackText` (boolean, `reframed` vino falsy y se usó el transcript crudo — señal directa para insight #17), `wordCount` del texto de salida; si `error`: `errorMessage` (mensaje corto, sin datos sensibles) | Un solo evento con `outcome` en vez de dos nombres distintos — es literalmente "el mismo momento del código, dos variantes", como lo describe la spec. `attempt` sube en cada tap de "Reintentar". |
| 3 | Mazo mostrado | `home_daily_card_deck_shown` | `dateKey`, `isFirstEver` (boolean) | Dispara cuando las 3 cartas boca abajo se montan. |
| 4 | Carta elegida | `home_daily_card_card_chosen` | `position: 1 \| 2 \| 3` (izquierda a derecha), `msSinceDeckShown` | Tap sobre cualquiera de las 3. |
| 5 | Revelado de texto completado | `home_daily_card_reveal_completed` | `reducedMotion: boolean` | Dispara al terminar la animación por tramos, o el cross-fade si `prefers-reduced-motion`. |
| 6 | Sentimiento capturado | `home_daily_card_feeling_selected` | `feeling`, `msSinceRevealCompleted` | Tap en un chip del `MoodPicker` de `inicio`, post-revelado. |
| 7 | Inicio guardado | `home_daily_card_inicio_saved` | `dateKey`, `hadReframeRetry: boolean` | Tap en `Guardar inicio`. `hadReframeRetry` = hubo algún evento #2 con `outcome: "error"` antes, en esta sesión, para este `dateKey`. |
| 8 | Carta ya revelada al reabrir | `home_daily_card_reopened_revealed` | `sessionType: "reload" \| "new_session"` | Ver mecanismo de detección abajo. |

**Detección de `sessionType` (evento 8):** usar `sessionStorage` (no
`localStorage` — se borra al cerrar la pestaña, que es justo la distinción
que se necesita) con una key `rituales_daily_card_session_seen_v1` que
guarda el último `dateKey` visto. Al hidratar una carta ya revelada: si
`sessionStorage` ya tiene ese `dateKey` marcado → `"reload"` (misma pestaña,
recargó o volvió a navegar a Home); si no → `"new_session"` (pestaña nueva o
recién abierta) y se marca. Esto responde directamente a la pregunta que
motiva 3.3.2: cuánta gente vuelve a revisar su carta más tarde en el mismo
día, en una sesión nueva.

**`isFirstEver`** (eventos 1 y 3, y también la línea de refuerzo de la
decisión c.3 de la spec de UX): un solo helper nuevo en
`daily-anchor.ts`, `hasCompletedInicioBefore()`, que escanea
`rituales_daily_anchor_v1` completo (todas las `dateKey` guardadas, no solo
hoy) buscando algún día con `steps.includes("inicio")` que no sea la fecha
de hoy. No hace falta backend nuevo para esto — ya lo señala la propia spec
de UX. Se reusa el mismo resultado para las tres cosas (evento 1, evento 3,
línea de refuerzo), calculado una sola vez por render del paso `Inicio`.

**Abandono:** no se instrumenta un evento explícito — se calcula por
ausencia comparando, por `dateKey`+usuario/sesión, hasta qué evento de la
tabla llegó cada funnel, tal como ya lo resuelve la spec de UX. No es tarea
de esta implementación construir ese análisis, solo dejar los 8 eventos
disparando con datos suficientes para hacerlo después.

---

## 4. Sync del borrador local anónimo al loguearse

**Decisión: mecanismo específico de esta feature, no una abstracción
genérica reusable todavía.** La sección 11.3 (perfil) que menciona el plan
grande **no está construida** — no existe hoy `rituales_profile_draft_v1`
en el código (se confirmó por grep, cero resultados). Construir una
abstracción genérica de "sync de cualquier draft" para un segundo consumidor
que no existe es especulativo (YAGNI) y además esa feature de perfil ni
siquiera tiene su propio plan de implementación todavía. La solución
concreta:

1. Nuevo archivo `rituales-app/src/app/lib/daily-card-service.ts` (mismo
   nivel que `anchor-service.ts`/`ritual-service.ts`), con:
   - `getDailyCard(dateKey)` → `GET /me/daily-card?date=`.
   - `createDailyCard({ dateKey, intentionText, feeling })` → `POST`.
   - `updateDailyCardFeeling({ dateKey, feeling })` → `PATCH`.
   - Todas pasan el JWT vía `Authorization: Bearer`, mismo patrón que
     `user-service.ts`.
2. Borrador local anónimo: nueva key de `localStorage`,
   `rituales_daily_card_draft_v1`, shape `{ [dateKey]: { intentionText, feeling, synced: boolean } }` — mismo shape por-`dateKey` que ya usa
   `rituales_daily_anchor_v1`, para consistencia. Se escribe únicamente
   cuando `session` es `null` en el momento de elegir carta / guardar
   sentimiento.
3. `syncDailyCardDraftOnLogin(userId: string)` en el mismo
   `daily-card-service.ts`: lee la entrada de **hoy** del draft (si hay
   entradas de días anteriores sin sincronizar, se ignoran — quedaron
   obsoletas, no se backfillean); si existe y `synced !== true`, llama
   `createDailyCard(...)`. Si la respuesta trae `created: false` (alguien ya
   tenía carta ese día en esa cuenta desde otro lado), se descarta el texto
   local y se usa el `card` del servidor. Si trae `feeling` en el draft y el
   `POST` no lo aceptó (porque ya existía fila), se intenta un `PATCH`
   adicional solo si el `feeling` remoto todavía es `null`. Al terminar
   (éxito o fila-ya-existente), marca `synced: true` en el draft — no lo
   borra, para no perder el texto si el usuario mira la pestaña de Crear
   justo en ese instante. Errores de red: no marca `synced`, queda para
   reintentar en el próximo `SIGNED_IN` (no hay reintento automático dentro
   de la misma sesión — no es un requisito de esta ronda, y agregar polling
   sería fricción técnica sin pedido explícito).
4. Se llama **una sola vez**, desde `UserContext.tsx`, dentro de la rama
   `if (event === "SIGNED_IN" && session?.user)` ya existente (línea 154),
   como una promesa más junto al `track("login", ...)` que ya está ahí. Para
   dejar la puerta abierta a que 11.3 agregue su propio sync después sin
   refactor, esa rama pasa a tener la forma:
   ```
   if (event === "SIGNED_IN" && session?.user) {
     track("login", { userId: session.user.id });
     void Promise.allSettled([
       syncDailyCardDraftOnLogin(session.user.id),
       // futuros syncs de otros drafts locales van acá
     ]);
   }
   ```
   Esto es la única pieza de "genérico" que se construye ahora: un único
   punto de entrada con un array, no una librería de pub/sub. Agregar el
   sync de perfil de 11.3 el día que se construya es agregar un elemento al
   array, no tocar `UserContext.tsx` de nuevo.

---

## 5. Fix de los 2 bugs detectados

**Bug 1 — `reframeIntention` sin `catch` (`Home.tsx` líneas 609-615):**
reemplazar el `try { } finally { }` actual por:
- `try { ... } catch (error) { ... } finally { setIsReframing(false) }`.
- En el `catch`: no tocar `generatedIntention` (queda `null`), guardar el
  `transcript` que falló en un estado nuevo (ej. `failedTranscript`) para
  que "Reintentar" no obligue a re-dictar, disparar el evento 2 con
  `outcome: "error"`, y setear un estado de error (ej. `reframeError: string`)
  que la UI usa para mostrar el bloque "Reencuadre fallido" de la spec de UX
  (copy exacto: `"No pudimos armar tu carta. Tu texto quedó guardado — probá
  de nuevo."` + botón `Reintentar`).
- Extraer el cuerpo actual del `try` a una función nombrada (ej.
  `runReframe(transcript: string, attempt: number)`) para que tanto
  `recognition.onend` como el botón "Reintentar" la llamen igual, sin
  duplicar lógica ni forzar una nueva grabación de voz para reintentar.

**Bug 2 — `isDailyCardRevealed` no se hidrata (estado efímero):**
- Se elimina como fuente de verdad. La UI del paso `Inicio` pasa a decidir
  su estado ("Vacío" / "Mazo visible" / "Revelando" / "Carta ya revelada
  hoy") a partir de un `useEffect` que, al montar (o al cambiar
  `session`/`selectedDateKey`), llama:
  - si hay sesión: `getDailyCard(selectedDateKey)` — si devuelve `card`,
    setea `generatedIntention = card.intentionText`, `inicioFeeling = card.feeling`, y un nuevo estado derivado (ej. `dailyCardStatus: "revealed"`) sin pasar por mazo ni flip; dispara el evento 8.
  - si no hay sesión: lee `rituales_daily_card_draft_v1` para
    `selectedDateKey` — mismo hidratado, sin red.
  - si no hay nada en ninguno de los dos casos: estado "Vacío" (mic
    disponible), como hoy.
- Esto reemplaza tanto el `useState(false)` inicial como cualquier lógica
  que dependiera de que la carta se revela solo dentro de la misma sesión de
  React.

**Bug 3 (detectado en la spec de UX, no en el pedido original pero ya
señalado como parte de la misma tarea):** el `MoodPicker` de `inicio`
(líneas ~1215+) deja de renderizarse incondicionalmente — se monta solo
cuando el estado derivado es "carta revelada" (ya sea porque se hidrató
desde persistencia, o porque terminó la animación de revelado por tramos).

---

## 6. Orden de ejecución

1. **Backend primero, completo, antes de tocar `Home.tsx`.** Migración SQL
   (sección 1) → los tres endpoints (sección 2) → actualizar
   `BackendContract.md`. Se puede probar con `curl`/Postman contra el
   backend corriendo local antes de escribir una sola línea de UI. Razón del
   orden: el frontend necesita un contrato estable para decidir la forma
   exacta de los estados derivados (bug 2), y probar la semántica
   "get-or-create" del `POST` es más simple aislada que integrada con
   animación.
2. **Capa de datos del frontend, sin UI todavía:** `daily-card-service.ts`
   completo (incluye `syncDailyCardDraftOnLogin`) + el borrador local. Se
   puede validar con la consola del navegador antes de tocar `Home.tsx`.
3. **Bug 1 (catch de `reframeIntention`) como cambio aislado y chico** —
   no depende de nada de lo anterior, es una corrección de manejo de error
   pura. Conviene hacerlo temprano porque es bajo riesgo y ya es valioso
   incluso antes de que exista el mazo.
4. **Reescritura de la interacción del paso `Inicio`** (mazo de 3 → flip →
   revelado por tramos → `MoodPicker` gateado → estado "ya revelada hoy"),
   que absorbe los bugs 2 y 3 porque están intrínsecamente atados al nuevo
   estado derivado, no tiene sentido resolverlos dos veces. Incluye el nuevo
   `STEP_COPY.inicio`, el copy del mazo, y la línea de refuerzo de primera
   vez (`hasCompletedInicioBefore()`).
5. **Instrumentación de los 8 eventos**, en paralelo al paso 4 (cada evento
   se agrega en el mismo commit que construye el estado que lo dispara, no
   como una pasada aparte al final).
6. **Sync de borrador anónimo al loguearse** (sección 4) al final — depende
   de que el flujo logueado ya funcione de punta a punta, y es una capa
   sobre un caso borde (usuario anónimo que después se loguea el mismo día),
   no el camino principal.
7. **Actualizar `CLAUDE.md` (rituales-app)**: agregar
   `rituales_daily_card_draft_v1` a la tabla de localStorage keys, y una
   mención breve en la sección "Daily Anchor" (o una subsección nueva) de
   que el paso `Inicio` específicamente ya no es local-first sino
   backend-first vía `daily-card-service.ts`, para que quede claro que no
   sigue el mismo patrón que `anchor-service.ts` (evita que alguien lo
   asuma por analogía en el futuro).

## Criterio de aceptación (además del ya definido en la spec de UX)

- `GET /api/me/daily-card?date=` sin sesión → `401` (via `requireUser`).
- Llamar `POST` dos veces seguidas con el mismo `dateKey` y distinto
  `intentionText` nunca cambia la fila después de la primera — la segunda
  respuesta trae `created: false` y el `intentionText` original.
- Recargar la página en el paso `Inicio` después de haber elegido carta hoy
  (logueado) muestra la carta ya revelada sin ningún request a
  `reframeIntention` ni a Claude — solo el `GET`.
- Los 8 eventos de la tabla de la sección 3 aparecen en `rituales_events`
  (localStorage) y en la tabla `events`/`ritual_events` al recorrer el flujo
  completo una vez.
- Un usuario anónimo puede completar todo el flujo de la carta sin loguearse
  (queda en `rituales_daily_card_draft_v1`), y al loguearse esa carta pasa a
  existir en `daily_intention_cards` sin que la persona repita ninguna
  acción.
