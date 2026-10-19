import { getOracleCard } from "./oracle-deck.js";

export function mapDailyIntentionRow(row) {
  if (!row) return null;

  return {
    dateKey: row.date_key,
    inputText: row.input_text,
    intentionText: row.intention_text,
    createdAt: row.created_at ?? null,
  };
}

// El contenido del arcano vive en el mazo (oracle-deck.js); la fila solo
// guarda cuál salió.
export function mapDailyOracleRow(row) {
  if (!row) return null;

  const card = getOracleCard(row.card_id);
  if (!card) return null;

  return {
    dateKey: row.date_key,
    cardId: card.id,
    number: card.number,
    name: card.name,
    keywords: card.keywords,
    mirada: card.mirada,
    consejo: card.consejo,
    createdAt: row.created_at ?? null,
  };
}
