import { Router } from "express";
import { requireUser } from "../lib/auth.js";
import { reframeIntention } from "../lib/claude.js";
import { mapDailyIntentionRow, mapDailyOracleRow } from "../lib/daily.js";
import { drawOracleCard } from "../lib/oracle-deck.js";
import { mapRitualRow } from "../lib/rituals.js";
import { supabase } from "../lib/supabase.js";

export const meRouter = Router();

async function getLikesCountMap(ritualIds) {
  if (!ritualIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("ritual_likes")
    .select("ritual_id")
    .in("ritual_id", ritualIds);

  if (error) throw error;

  const counts = new Map();
  for (const row of data || []) {
    counts.set(row.ritual_id, (counts.get(row.ritual_id) || 0) + 1);
  }
  return counts;
}

function isMissingTableError(error) {
  return error?.code === "PGRST205";
}

function isValidDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(`${dateKey || ""}`);
}

const REFRAME_TIMEOUT_MS = 12000;
const MAX_INPUT_LENGTH = 1000;
const RECENT_CARDS_TO_AVOID = 7;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

async function getDailyRow(table, userId, dateKey) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .eq("date_key", dateKey)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

// Inserta la fila del día. Si otra pestaña la creó mientras tanto (unique
// user_id + date_key), devuelve esa en vez de fallar.
async function insertDailyRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select("*").single();
  if (!error) return { row: data, created: true };
  if (error.code !== "23505") throw error;
  return { row: await getDailyRow(table, row.user_id, row.date_key), created: false };
}

// ── Intención del día: la persona cuenta qué desea y recibe una intención ──

meRouter.get("/daily-intention", requireUser, async (req, res, next) => {
  try {
    const dateKey = `${req.query.date || ""}`.trim();
    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ error: "Fecha inválida." });
    }

    const row = await getDailyRow("daily_intentions", req.user.id, dateKey);
    res.json({ intention: mapDailyIntentionRow(row) });
  } catch (error) {
    next(error);
  }
});

// Idempotente: si ya hay una intención para esa fecha, la devuelve con
// `created: false` en vez de escribir otra.
meRouter.post("/daily-intention", requireUser, async (req, res, next) => {
  try {
    const dateKey = `${req.body?.dateKey || ""}`.trim();
    const inputText = `${req.body?.inputText || ""}`.trim().slice(0, MAX_INPUT_LENGTH);

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ error: "Fecha inválida." });
    }

    const existing = await getDailyRow("daily_intentions", req.user.id, dateKey);
    if (existing) {
      return res.json({ intention: mapDailyIntentionRow(existing), created: false });
    }

    if (!inputText) {
      return res.status(400).json({ error: "Contanos qué deseás hoy para escribir tu intención." });
    }

    // Sin API key se usa el texto tal cual.
    let intentionText = inputText;
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        intentionText =
          (await withTimeout(reframeIntention(inputText), REFRAME_TIMEOUT_MS, "Reframe")) || inputText;
      } catch (error) {
        console.error("Daily intention reframe failed:", error.message);
        return res.status(502).json({ error: "No pudimos escribir tu intención. Probá de nuevo." });
      }
    }

    const { row, created } = await insertDailyRow("daily_intentions", {
      user_id: req.user.id,
      date_key: dateKey,
      input_text: inputText,
      intention_text: intentionText,
    });
    res.status(created ? 201 : 200).json({ intention: mapDailyIntentionRow(row), created });
  } catch (error) {
    next(error);
  }
});

// ── Oráculo del día: la persona saca una carta del mazo curado ──

async function getRecentCardIds(userId) {
  const { data, error } = await supabase
    .from("daily_oracle_cards")
    .select("card_id")
    .eq("user_id", userId)
    .order("date_key", { ascending: false })
    .limit(RECENT_CARDS_TO_AVOID);

  if (error) throw error;
  return (data || []).map((row) => row.card_id);
}

meRouter.get("/daily-oracle", requireUser, async (req, res, next) => {
  try {
    const dateKey = `${req.query.date || ""}`.trim();
    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ error: "Fecha inválida." });
    }

    const row = await getDailyRow("daily_oracle_cards", req.user.id, dateKey);
    res.json({ card: mapDailyOracleRow(row) });
  } catch (error) {
    next(error);
  }
});

// Idempotente: si ya sacó carta ese día, devuelve la misma con `created: false`.
meRouter.post("/daily-oracle", requireUser, async (req, res, next) => {
  try {
    const dateKey = `${req.body?.dateKey || ""}`.trim();
    const moonPhase = `${req.body?.moonPhase || ""}`.trim();

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ error: "Fecha inválida." });
    }

    const existing = await getDailyRow("daily_oracle_cards", req.user.id, dateKey);
    if (existing) {
      return res.json({ card: mapDailyOracleRow(existing), created: false });
    }

    const card = drawOracleCard({
      moonPhase,
      excludeIds: await getRecentCardIds(req.user.id),
    });

    const { row, created } = await insertDailyRow("daily_oracle_cards", {
      user_id: req.user.id,
      date_key: dateKey,
      card_id: card.id,
    });
    res.status(created ? 201 : 200).json({ card: mapDailyOracleRow(row), created });
  } catch (error) {
    next(error);
  }
});

meRouter.get("/dashboard", requireUser, async (req, res, next) => {
  try {
    const user = req.user;

    const [
      { data: ownRows, error: ownError },
      { data: favoriteRows, error: favoriteError },
    ] = await Promise.all([
      supabase
        .from("rituals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ritual_favorites")
        .select("ritual_id, created_at, rituals(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (ownError) throw ownError;

    const safeFavoriteRows = isMissingTableError(favoriteError) ? [] : favoriteRows || [];
    if (favoriteError && !isMissingTableError(favoriteError)) throw favoriteError;

    const ownIds = (ownRows || []).map((row) => row.id);
    const favoriteRituals = safeFavoriteRows
      .map((row) => row.rituals)
      .filter(Boolean);
    const favoriteIds = favoriteRituals.map((row) => row.id);
    const likesMap = await getLikesCountMap([...new Set([...ownIds, ...favoriteIds])]);

    const ownRituals = (ownRows || []).map((row) =>
      mapRitualRow(row, {
        likesCount: likesMap.get(row.id) || 0,
        author:
          user.user_metadata?.full_name ||
          user.email ||
          "Tú",
      }),
    );

    const favorites = (favoriteRows || [])
      .filter((row) => row.rituals)
      .map((row) =>
        mapRitualRow(row.rituals, {
          likesCount: likesMap.get(row.rituals.id) || 0,
          favoritedByViewer: true,
          author: row.rituals.user_id === user.id
            ? user.user_metadata?.full_name || user.email || "Tú"
            : null,
        }),
      );

    const likesReceived = ownRituals.reduce(
      (total, ritual) => total + (ritual.likesCount || 0),
      0,
    );

    res.json({
      profile: {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || "",
        likesReceived,
      },
      rituals: {
        own: ownRituals,
        favorites,
      },
    });
  } catch (error) {
    next(error);
  }
});

meRouter.patch("/profile", requireUser, async (req, res, next) => {
  try {
    const fullName = `${req.body?.fullName || ""}`.trim();

    const { data, error } = await supabase.auth.admin.updateUserById(req.user.id, {
      user_metadata: {
        ...req.user.user_metadata,
        full_name: fullName,
      },
    });

    if (error) throw error;

    res.json({
      profile: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || "",
      },
    });
  } catch (error) {
    next(error);
  }
});
