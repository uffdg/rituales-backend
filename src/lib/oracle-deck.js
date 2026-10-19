// Mazo curado del Oráculo del día. El texto lo escribe el equipo; la IA solo
// personaliza el gesto (ver generateOracleGesture en claude.js) y, si falla,
// se muestra el gesto curado de la carta.
//
// `phases` ordena qué cartas tienen más chances de salir según la luna:
// nueva (empezar), creciente (impulso), llena (vínculo, ver), menguante (soltar).
// `symbol` es una clave que el frontend mapea a un ícono.

export const ORACLE_DECK = [
  // Luna nueva
  { id: "la-semilla", name: "La Semilla", symbol: "sprout", phases: ["nueva"],
    intention: "Hoy empiezo algo pequeño sin esperar a tenerlo todo claro.",
    gesture: "Escribí en un papel el primer paso, solo uno, y hacelo antes del mediodía." },
  { id: "la-puerta", name: "La Puerta", symbol: "door", phases: ["nueva"],
    intention: "Hoy me animo a abrir una conversación que vengo postergando.",
    gesture: "Mandá ese mensaje antes de las 12, aunque sea una línea." },
  { id: "la-llave", name: "La Llave", symbol: "key", phases: ["nueva", "creciente"],
    intention: "Hoy confío en que ya tengo lo que necesito para dar el próximo paso.",
    gesture: "Antes de pedir ayuda, dedicale diez minutos a intentarlo con lo que sabés." },
  { id: "la-pagina-en-blanco", name: "La Página en Blanco", symbol: "feather", phases: ["nueva"],
    intention: "Hoy no arrastro lo de ayer: arranco de cero.",
    gesture: "Ordená tu escritorio o tu pantalla durante cinco minutos antes de empezar." },
  { id: "la-pregunta", name: "La Pregunta", symbol: "eye", phases: ["nueva", "menguante"],
    intention: "Hoy dejo que una pregunta me acompañe sin apurar la respuesta.",
    gesture: "Escribí la pregunta en el celular y releela al mediodía y a la noche." },
  { id: "el-alba", name: "El Alba", symbol: "sun", phases: ["nueva"],
    intention: "Hoy le doy al primer rato del día un poco de silencio.",
    gesture: "Los primeros diez minutos, sin pantallas: un vaso de agua, la ventana, tres respiraciones." },
  { id: "la-brujula", name: "La Brújula", symbol: "compass", phases: ["nueva", "creciente"],
    intention: "Hoy decido desde lo que me importa, no desde la urgencia.",
    gesture: "Ante cada pedido nuevo, preguntate: ¿esto me acerca a lo que quiero?" },
  { id: "la-chispa", name: "La Chispa", symbol: "flame", phases: ["nueva"],
    intention: "Hoy le hago lugar a una idea que me entusiasma.",
    gesture: "Dedicale quince minutos sin interrupciones, con el teléfono en otra habitación." },

  // Creciente
  { id: "el-camino", name: "El Camino", symbol: "footprints", phases: ["creciente"],
    intention: "Hoy avanzo un paso, aunque sea chico.",
    gesture: "Elegí la tarea que más venís esquivando y trabajá en ella veinte minutos." },
  { id: "la-raiz", name: "La Raíz", symbol: "sprout", phases: ["creciente"],
    intention: "Hoy sostengo lo que empecé, aunque no tenga ganas.",
    gesture: "Hacé la versión mínima de tu hábito: cinco minutos cuentan." },
  { id: "el-arco", name: "El Arco", symbol: "target", phases: ["creciente"],
    intention: "Hoy pongo toda mi atención en una cosa por vez.",
    gesture: "Mientras trabajás, cerrá todas las pestañas menos una." },
  { id: "la-montana", name: "La Montaña", symbol: "mountain", phases: ["creciente"],
    intention: "Hoy confío en el progreso lento.",
    gesture: "A la noche, anotá una cosa que hiciste hoy y que ayer no." },
  { id: "el-fuego", name: "El Fuego", symbol: "flame", phases: ["creciente", "llena"],
    intention: "Hoy pongo mi fuerza en lo que de verdad quiero.",
    gesture: "Mové el cuerpo diez minutos antes de la tarea más difícil del día." },
  { id: "la-voz", name: "La Voz", symbol: "message", phases: ["creciente"],
    intention: "Hoy digo lo que pienso con calma y claridad.",
    gesture: "En la próxima reunión o charla, decí tu opinión en la primera mitad." },
  { id: "el-puente", name: "El Puente", symbol: "hand", phases: ["creciente", "llena"],
    intention: "Hoy pido ayuda con algo que vengo cargando en soledad.",
    gesture: "Escribile a una persona y contale en qué te vendría bien una mano." },
  { id: "la-marea-alta", name: "La Marea Alta", symbol: "waves", phases: ["creciente"],
    intention: "Hoy aprovecho el impulso y no me freno a dudar.",
    gesture: "Cuando aparezca el «después lo hago», si lleva menos de dos minutos, hacelo ahora." },

  // Luna llena
  { id: "el-espejo", name: "El Espejo", symbol: "eye", phases: ["llena"],
    intention: "Hoy me miro con la misma amabilidad con la que miro a quien quiero.",
    gesture: "Cuando te critiques, preguntate qué le dirías a alguien que querés." },
  { id: "el-abrazo", name: "El Abrazo", symbol: "heart", phases: ["llena"],
    intention: "Hoy cuido un vínculo que me importa.",
    gesture: "Llamá —no escribas— a alguien a quien hace mucho no escuchás." },
  { id: "la-cosecha", name: "La Cosecha", symbol: "leaf", phases: ["llena"],
    intention: "Hoy reconozco lo que ya logré.",
    gesture: "Anotá tres cosas que salieron bien esta semana." },
  { id: "la-luz", name: "La Luz", symbol: "sun", phases: ["llena"],
    intention: "Hoy dejo ver algo de mí que suelo guardar.",
    gesture: "Compartí algo que hiciste o pensaste con una persona de confianza." },
  { id: "la-mesa-compartida", name: "La Mesa Compartida", symbol: "house", phases: ["llena"],
    intention: "Hoy disfruto sin apuro de un momento con otros.",
    gesture: "Comé al menos una comida sin el teléfono en la mesa." },
  { id: "el-agradecimiento", name: "El Agradecimiento", symbol: "star", phases: ["llena", "menguante"],
    intention: "Hoy noto lo que ya está bien.",
    gesture: "Antes de dormir, agradecé en voz baja una cosa concreta del día." },
  { id: "el-circulo", name: "El Círculo", symbol: "circle", phases: ["llena", "menguante"],
    intention: "Hoy cierro un tema pendiente y lo celebro.",
    gesture: "Tachá algo de tu lista que arrastrás hace semanas y date un gusto chico." },
  { id: "la-flor", name: "La Flor", symbol: "flower", phases: ["llena"],
    intention: "Hoy me permito disfrutar sin tener que ganármelo.",
    gesture: "Hacé una cosa solo porque te gusta, aunque sea diez minutos." },

  // Menguante
  { id: "la-pausa", name: "La Pausa", symbol: "wind", phases: ["menguante"],
    intention: "Hoy me doy permiso para ir más lento.",
    gesture: "Antes de cada reunión o tarea nueva, tres respiraciones largas." },
  { id: "la-hoja-que-cae", name: "La Hoja que Cae", symbol: "leaf", phases: ["menguante"],
    intention: "Hoy suelto algo que ya no necesito sostener.",
    gesture: "Elegí una tarea de tu lista y borrala sin culpa." },
  { id: "el-rio", name: "El Río", symbol: "waves", phases: ["menguante"],
    intention: "Hoy dejo pasar lo que no depende de mí.",
    gesture: "Cuando algo te enoje, preguntate si depende de vos. Si no, soltalo con una exhalación larga." },
  { id: "el-refugio", name: "El Refugio", symbol: "house", phases: ["menguante"],
    intention: "Hoy cuido mi tiempo y digo que no cuando hace falta.",
    gesture: "Decí «ahora no» a un pedido que hoy no te entra." },
  { id: "la-luna-menguante", name: "La Luna Menguante", symbol: "moon", phases: ["menguante"],
    intention: "Hoy descanso sin sentir que pierdo el tiempo.",
    gesture: "Acostate media hora antes que de costumbre." },
  { id: "la-pluma", name: "La Pluma", symbol: "feather", phases: ["menguante"],
    intention: "Hoy hago las cosas con menos esfuerzo y más liviandad.",
    gesture: "Bajá la exigencia de una tarea: hacela al 80 % y dala por terminada." },
  { id: "el-silencio", name: "El Silencio", symbol: "moon", phases: ["menguante", "nueva"],
    intention: "Hoy escucho más de lo que hablo.",
    gesture: "En tu próxima conversación, esperá dos segundos antes de responder." },
  { id: "el-barrido", name: "El Barrido", symbol: "wind", phases: ["menguante"],
    intention: "Hoy hago lugar sacando algo del medio.",
    gesture: "Tirá o regalá tres cosas que no usás." },
];

const CARDS_BY_ID = new Map(ORACLE_DECK.map((card) => [card.id, card]));

export function getOracleCard(cardId) {
  return CARDS_BY_ID.get(cardId) ?? null;
}

// Normaliza las etiquetas de fase que usa el frontend ("Luna nueva",
// "Creciente fina", "Cuarto menguante", "Eclipse lunar"…) a los cuatro grupos
// del mazo.
export function normalizeMoonPhase(moonPhase) {
  const value = `${moonPhase || ""}`.toLowerCase();
  if (value.includes("nueva")) return "nueva";
  if (value.includes("llena")) return "llena";
  if (value.includes("menguante") || value.includes("eclipse")) return "menguante";
  if (value.includes("creciente")) return "creciente";
  return null;
}

// Elige una carta al azar: las de la fase actual pesan el triple, y se evitan
// las que la persona sacó en los últimos días para que el mazo no se repita.
export function drawOracleCard({ moonPhase, excludeIds = [] }) {
  const phase = normalizeMoonPhase(moonPhase);
  const excluded = new Set(excludeIds);
  const candidates = ORACLE_DECK.filter((card) => !excluded.has(card.id));
  const pool = candidates.length ? candidates : ORACLE_DECK;

  const weighted = pool.map((card) => ({
    card,
    weight: phase && card.phases.includes(phase) ? 3 : 1,
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);

  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll < 0) return item.card;
  }
  return weighted[weighted.length - 1].card;
}
