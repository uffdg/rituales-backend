# UX/UI spec — WTP bloqueante para voz guiada

Estado: borrador para revisión

## Problema / evidencia

En `RitualDetail.tsx`, el experimento de willingness-to-pay aparece hoy como una tarjeta dentro de la hoja de audio y la generación de voz sigue corriendo aunque la persona no responda. Mariana corrigió: "el modal debería bloquear la acción hasta obtener respuesta".

La motivación viene del insight #42 de `guidelines/feedback-log.md`: validar disposición a pagar por la voz guiada, alineado con el split freemium ya conversado: ambiente gratis/cacheado vs. voz guiada generada como posible feature paga. Sigue siendo un experimento de validación, no un cobro real.

## Propuesta

### 1. Comportamiento exacto bloqueante

- El prompt aparece solo cuando se solicita una nueva generación de voz guiada desde la segunda generación en adelante.
- No aparece al reproducir un audio ya cacheado.
- No aparece en la primera generación de voz guiada.
- Al tocar `Iniciar`, se abre la hoja inferior como hoy.
- Si corresponde mostrar el experimento, la hoja entra primero en estado `pricingPrompt`.
- Mientras `pricingPrompt` está activo:
  - no se llama todavía a `renderGuidedAudio`;
  - no se muestra el `GuidedAudioPlayer` como acción principal;
  - no hay CTA de play visible;
  - el tap sobre el overlay no cierra la hoja;
  - no existe botón visible de "seguir sin responder";
  - cambiar a "solo música de fondo" queda oculto hasta responder.
- La persona debe elegir una de dos respuestas:
  - `Sí, pagaría`;
  - `No por ahora`.
- Después de cualquiera de las dos respuestas:
  - se trackea la respuesta;
  - se cierra el bloque de precio;
  - recién ahí empieza la generación de audio guiado;
  - el acceso no cambia según la respuesta.
- `dismissed` no debe existir como camino normal de UI. Solo corresponde trackear `pricing_experiment_dismissed` si la hoja/página se desmonta con el prompt abierto sin respuesta por una salida externa: navegación del navegador, cambio de ruta, cierre de pestaña o error inesperado. Si esto no puede medirse de forma confiable, se omite `dismissed` en esta iteración.

## Copy final

Eyebrow:

`VOZ GUIADA`

Título:

`¿Pagarías por seguir usando esta voz?`

Body:

`La primera guía queda disponible. Para sostener nuevas voces, estamos probando una membresía de USD 10 por mes. ¿Te haría sentido?`

CTA primario:

`Sí, pagaría`

CTA secundario:

`No por ahora`

Microcopy bajo CTAs:

`Tu ritual sigue después de responder.`

Copy de carga posterior:

`Preparando tu voz guiada...`

Copy de error:

`No pudimos generar el audio guiado. Probá de nuevo.`

Notas de voz:

- No mencionar IA, modelo, backend, ElevenLabs ni tecnología.
- No usar urgencia artificial, descuento, promesa de transformación ni lenguaje new age.
- Mantener tuteo rioplatense: `pagarías`, `te`, `probá`.

## 2. Jerarquía visual en hoja/modal móvil

Referencia visual: la hoja inferior actual de `RitualDetail.tsx`, reutilizando `editorial-sheet`, `editorial-sheet-handle`, `editorial-eyebrow`, `editorial-title-section`, `editorial-body-muted`, `editorial-button-primary` y `editorial-button-soft`.

Dentro de la hoja:

1. Handle centrado arriba, igual al patrón actual.
2. Eyebrow `VOZ GUIADA`, clase `editorial-eyebrow`, margen inferior corto.
3. Título con `editorial-title-section`, no como card secundaria.
4. Body con `editorial-body-muted`, ancho completo, 2-3 líneas máximo en 390px.
5. CTAs apilados verticalmente en mobile para evitar duda:
   - primario: `editorial-button-primary`, ancho completo;
   - secundario: `editorial-button-soft`, ancho completo.
6. Microcopy final con `editorial-meta`, centrado o alineado a la izquierda según respire mejor en la hoja.

No usar tarjeta dentro de tarjeta. El prompt debe sentirse como el contenido principal de la hoja, no como un aviso incrustado encima del player.

## 3. Estados

Estado inicial:

- La persona toca `Iniciar`.
- Si no hay audio cacheado y la generación nueva es la segunda o mayor, mostrar prompt bloqueante.
- Track: `pricing_experiment_shown` con `ritualId`, `generationNumber`, `hasCachedAudio: false`.

Respuesta aceptada:

- Track: `pricing_experiment_accepted`.
- Ocultar prompt.
- Mostrar estado de carga de generación.
- Generar audio.
- Reproducir cuando esté listo, igual que el flujo actual.

Respuesta rechazada:

- Track: `pricing_experiment_declined`.
- Ocultar prompt.
- Mostrar estado de carga de generación.
- Generar audio.
- Reproducir cuando esté listo, igual que el flujo actual.

Dismiss excepcional:

- No hay dismiss visible.
- Overlay/backdrop no cierra mientras el prompt está activo.
- Si la pantalla se desmonta sin respuesta y se puede medir de forma confiable, trackear `pricing_experiment_dismissed` con `reason`.

Carga:

- Después de responder, mostrar `Preparando tu voz guiada...`.
- No volver a mostrar el prompt durante esa misma generación.

Error:

- Si falla la generación después de responder, mostrar `No pudimos generar el audio guiado. Probá de nuevo.`
- Reintentar no debe volver a pedir respuesta para la misma generación ya respondida.

Audio listo:

- Mostrar `GuidedAudioPlayer`.
- Mantener autoplay si ya existe y funciona.
- Permitir cerrar la hoja como hoy.

## 4. Criterios de aceptación

- En segunda generación nueva o posterior, tocar `Iniciar` no dispara `renderGuidedAudio` hasta que la persona toque `Sí, pagaría` o `No por ahora`.
- Mientras el prompt está visible, no se puede cerrar la hoja tocando el overlay ni avanzar al player sin responder.
- No existe botón `Seguir sin responder`.
- Responder `Sí, pagaría` trackea `pricing_experiment_accepted` y luego genera el audio.
- Responder `No por ahora` trackea `pricing_experiment_declined` y luego genera el audio.
- La respuesta no cambia el acceso: ambas opciones continúan hacia la voz guiada.
- El prompt no aparece si ya hay `guidedAudioUrl`.
- El prompt no aparece en la primera generación.
- El prompt no aparece al cambiar a música ambiente.
- El copy visible no menciona tecnología ni cobro real.
- En 390px de ancho, título, body y CTAs no se superponen ni requieren scroll excesivo antes de responder.
