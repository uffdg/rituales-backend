import { getOracleCard } from "./oracle-deck.js";

export function mapDailyIntentionCardRow(row) {
  if (!row) return null;

  // Filas anteriores al Oráculo del día no tienen card_id: se devuelven solo
  // con la intención, sin nombre ni símbolo.
  const card = row.card_id ? getOracleCard(row.card_id) : null;

  return {
    dateKey: row.date_key,
    cardId: row.card_id ?? null,
    name: card?.name ?? null,
    symbol: card?.symbol ?? null,
    intentionText: row.intention_text,
    gesture: row.gesture ?? card?.gesture ?? null,
    createdAt: row.created_at,
  };
}
