// Mazo del Oráculo del día: los 22 arcanos mayores del tarot Rider-Waite, al
// derecho. Cada carta trae la mirada (lo que el arcano produce, una forma de
// ver el día) y el consejo que da. El texto lo escribe el equipo; las
// ilustraciones viven en el frontend (rituales-app/src/app/components/arcana),
// mapeadas por `id`.

export const ORACLE_DECK = [
  { id: "el-loco", number: "0", name: "El Loco",
    keywords: ["Comienzo", "Confianza", "Libertad"],
    mirada: "El Loco produce apertura: no hace falta conocer todo el camino para dar el primer paso.",
    consejo: "Animate a algo nuevo hoy sin esperar a tenerlo todo resuelto." },
  { id: "el-mago", number: "I", name: "El Mago",
    keywords: ["Voluntad", "Habilidad", "Acción"],
    mirada: "El Mago produce enfoque: todo lo que necesitás ya está sobre tu mesa; falta decidir qué hacer con eso.",
    consejo: "Elegí una sola cosa y ponele toda tu atención. Empezá con lo que tenés." },
  { id: "la-sacerdotisa", number: "II", name: "La Sacerdotisa",
    keywords: ["Intuición", "Silencio", "Misterio"],
    mirada: "La Sacerdotisa produce escucha interna: hay respuestas que no llegan pensando, sino haciendo silencio.",
    consejo: "Antes de decidir, quedate un momento en silencio y notá qué sabés sin que nadie te lo diga." },
  { id: "la-emperatriz", number: "III", name: "La Emperatriz",
    keywords: ["Fertilidad", "Cuidado", "Creación"],
    mirada: "La Emperatriz produce cuidado: lo que crece necesita tiempo, cuerpo y ternura, no presión.",
    consejo: "Cuidá algo que estés haciendo crecer, empezando por tu cuerpo: comé bien, descansá, disfrutá." },
  { id: "el-emperador", number: "IV", name: "El Emperador",
    keywords: ["Estructura", "Límites", "Orden"],
    mirada: "El Emperador produce estructura: los límites claros no encierran, sostienen.",
    consejo: "Ponele un orden concreto a tu día y sostené un límite que venís postergando." },
  { id: "el-hierofante", number: "V", name: "El Hierofante",
    keywords: ["Tradición", "Aprendizaje", "Guía"],
    mirada: "El Hierofante produce pertenencia: hay saberes que vienen de otros y vale la pena escucharlos.",
    consejo: "Pedile consejo a alguien que admirás, o volvé a una práctica que te hace bien." },
  { id: "los-enamorados", number: "VI", name: "Los Enamorados",
    keywords: ["Elección", "Vínculo", "Valores"],
    mirada: "Los Enamorados producen elección: cada sí que das dice quién sos y qué te importa.",
    consejo: "Si tenés que elegir, elegí lo que esté de acuerdo con tus valores, no lo más cómodo." },
  { id: "el-carro", number: "VII", name: "El Carro",
    keywords: ["Determinación", "Avance", "Dirección"],
    mirada: "El Carro produce impulso: cuando fuerzas opuestas tiran, la dirección la ponés vos.",
    consejo: "Definí hacia dónde vas hoy y avanzá, aunque haya dudas tirando para otro lado." },
  { id: "la-fuerza", number: "VIII", name: "La Fuerza",
    keywords: ["Coraje", "Paciencia", "Compasión"],
    mirada: "La Fuerza produce un coraje suave: lo salvaje no se domina a los golpes, se acompaña con calma.",
    consejo: "Tratá tus emociones más intensas con paciencia, no con dureza." },
  { id: "el-ermitano", number: "IX", name: "El Ermitaño",
    keywords: ["Introspección", "Búsqueda", "Soledad elegida"],
    mirada: "El Ermitaño produce claridad: a veces hay que alejarse del ruido para ver la propia luz.",
    consejo: "Regalate un rato a solas hoy, sin pantallas, para escucharte." },
  { id: "la-rueda-de-la-fortuna", number: "X", name: "La Rueda de la Fortuna",
    keywords: ["Ciclos", "Cambio", "Destino"],
    mirada: "La Rueda produce perspectiva: nada se queda quieto; lo que hoy pesa también va a girar.",
    consejo: "Soltá el control de lo que no depende de vos y prestá atención a lo que trae el cambio." },
  { id: "la-justicia", number: "XI", name: "La Justicia",
    keywords: ["Verdad", "Equilibrio", "Responsabilidad"],
    mirada: "La Justicia produce honestidad: cada acción tiene consecuencias, y mirarlas de frente libera.",
    consejo: "Decí la verdad, empezando por la que te debés a vos." },
  { id: "el-colgado", number: "XII", name: "El Colgado",
    keywords: ["Pausa", "Entrega", "Otra perspectiva"],
    mirada: "El Colgado produce otra mirada: lo que parece una pausa forzada puede ser el lugar desde donde todo se ve distinto.",
    consejo: "No fuerces una solución hoy. Probá mirar el problema desde el lado opuesto." },
  { id: "la-muerte", number: "XIII", name: "La Muerte",
    keywords: ["Final", "Transformación", "Renacer"],
    mirada: "La Muerte produce transformación: algo termina para que algo nuevo tenga lugar.",
    consejo: "Dejá ir un hábito, una idea o una costumbre que ya cumplió su ciclo." },
  { id: "la-templanza", number: "XIV", name: "La Templanza",
    keywords: ["Equilibrio", "Moderación", "Integración"],
    mirada: "La Templanza produce armonía: no se trata de extremos, sino de encontrar la mezcla justa.",
    consejo: "Bajá un cambio en lo que te desborda y sumá un poco de lo que te falta." },
  { id: "el-diablo", number: "XV", name: "El Diablo",
    keywords: ["Apego", "Sombra", "Deseo"],
    mirada: "El Diablo produce conciencia de las cadenas: muchas están más flojas de lo que parecen.",
    consejo: "Nombrá un apego o una costumbre que te ata y fijate qué pasa si la soltás por un día." },
  { id: "la-torre", number: "XVI", name: "La Torre",
    keywords: ["Ruptura", "Revelación", "Liberación"],
    mirada: "La Torre produce despertar: lo que se cae de golpe estaba construido sobre algo que no era verdad.",
    consejo: "Si algo se rompe hoy, no te apures a reconstruirlo igual. Mirá qué te muestra." },
  { id: "la-estrella", number: "XVII", name: "La Estrella",
    keywords: ["Esperanza", "Renovación", "Fe"],
    mirada: "La Estrella produce esperanza: después de la tormenta, la calma deja ver el camino.",
    consejo: "Hacé algo que te devuelva la confianza: un paso chico hacia lo que soñás." },
  { id: "la-luna", number: "XVIII", name: "La Luna",
    keywords: ["Intuición", "Sueños", "Incertidumbre"],
    mirada: "La Luna produce intuición: no todo está claro, y eso también es parte del camino.",
    consejo: "Prestá atención a tus sueños y a lo que te inquieta, sin apurarte a darle forma." },
  { id: "el-sol", number: "XIX", name: "El Sol",
    keywords: ["Alegría", "Vitalidad", "Claridad"],
    mirada: "El Sol produce alegría: la vida se muestra tal cual es, simple y luminosa.",
    consejo: "Hacé algo que te dé alegría de verdad y compartilo con alguien." },
  { id: "el-juicio", number: "XX", name: "El Juicio",
    keywords: ["Llamado", "Despertar", "Renovación"],
    mirada: "El Juicio produce despertar: es momento de escuchar un llamado que venís postergando.",
    consejo: "Revisá tu historia sin culpa y elegí qué querés llevar al próximo capítulo." },
  { id: "el-mundo", number: "XXI", name: "El Mundo",
    keywords: ["Plenitud", "Cierre", "Integración"],
    mirada: "El Mundo produce plenitud: un ciclo se completa y todo lo vivido encuentra su lugar.",
    consejo: "Celebrá algo que terminaste. Reconocé lo que lograste antes de empezar lo próximo." },
];

const CARDS_BY_ID = new Map(ORACLE_DECK.map((card) => [card.id, card]));

export function getOracleCard(cardId) {
  return CARDS_BY_ID.get(cardId) ?? null;
}

// Elige un arcano al azar, evitando los que la persona sacó en los últimos
// días para que el mazo no se repita.
export function drawOracleCard({ excludeIds = [] } = {}) {
  const excluded = new Set(excludeIds);
  const candidates = ORACLE_DECK.filter((card) => !excluded.has(card.id));
  const pool = candidates.length ? candidates : ORACLE_DECK;
  return pool[Math.floor(Math.random() * pool.length)];
}
