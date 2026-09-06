export function mapDailyIntentionCardRow(row) {
  if (!row) return null;

  return {
    dateKey: row.date_key,
    intentionText: row.intention_text,
    feeling: row.feeling,
    createdAt: row.created_at,
  };
}
