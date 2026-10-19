import { getOracleCard } from "./oracle-deck.js";

export function mapDailyIntentionRow(row) {
  if (!row) return null;

  return {
    dateKey: row.date_key,
    inputText: row.input_text,
    intentionText: row.intention_text,
    createdAt: row.created_at,
  };
}

// El contenido de la carta vive en el mazo (oracle-deck.js); la fila solo
// guarda qué carta salió.
export function mapDailyOracleRow(row) {
  if (!row) return null;

  const card = getOracleCard(row.card_id);
  if (!card) return null;

  return {
    dateKey: row.date_key,
    cardId: card.id,
    name: card.name,
    symbol: card.symbol,
    message: card.message,
    gesture: card.gesture,
    createdAt: row.created_at,
  };
}
