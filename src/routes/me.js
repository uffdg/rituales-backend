import { Router } from "express";
import { requireUser } from "../lib/auth.js";
import { mapDailyIntentionCardRow } from "../lib/daily-intention-cards.js";
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

async function getDailyIntentionCard(userId, dateKey) {
  const { data, error } = await supabase
    .from("daily_intention_cards")
    .select("*")
    .eq("user_id", userId)
    .eq("date_key", dateKey)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

meRouter.get("/daily-card", requireUser, async (req, res, next) => {
  try {
    const dateKey = `${req.query.date || ""}`.trim();

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ error: "Fecha inválida." });
    }

    const card = await getDailyIntentionCard(req.user.id, dateKey);
    res.json({ card: mapDailyIntentionCardRow(card) });
  } catch (error) {
    next(error);
  }
});

meRouter.post("/daily-card", requireUser, async (req, res, next) => {
  try {
    const dateKey = `${req.body?.dateKey || ""}`.trim();
    const intentionText = `${req.body?.intentionText || ""}`.trim();
    const feeling =
      typeof req.body?.feeling === "string" && req.body.feeling.trim()
        ? req.body.feeling.trim()
        : null;

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ error: "Fecha inválida." });
    }

    if (!intentionText) {
      return res.status(400).json({ error: "La intención es requerida." });
    }

    const { data, error } = await supabase
      .from("daily_intention_cards")
      .insert({
        user_id: req.user.id,
        date_key: dateKey,
        intention_text: intentionText,
        feeling,
      })
      .select("*")
      .single();

    if (!error) {
      return res.status(201).json({
        card: mapDailyIntentionCardRow(data),
        created: true,
      });
    }

    if (error.code !== "23505") {
      throw error;
    }

    const existing = await getDailyIntentionCard(req.user.id, dateKey);
    res.json({
      card: mapDailyIntentionCardRow(existing),
      created: false,
    });
  } catch (error) {
    next(error);
  }
});

meRouter.patch("/daily-card", requireUser, async (req, res, next) => {
  try {
    const dateKey = `${req.body?.dateKey || ""}`.trim();
    const feeling =
      typeof req.body?.feeling === "string" && req.body.feeling.trim()
        ? req.body.feeling.trim()
        : null;

    if (!isValidDateKey(dateKey)) {
      return res.status(400).json({ error: "Fecha inválida." });
    }

    const existing = await getDailyIntentionCard(req.user.id, dateKey);
    if (!existing) {
      return res.status(404).json({ error: "Todavía no elegiste tu carta de hoy." });
    }

    const { data, error } = await supabase
      .from("daily_intention_cards")
      .update({ feeling })
      .eq("user_id", req.user.id)
      .eq("date_key", dateKey)
      .select("*")
      .single();

    if (error) throw error;

    res.json({ card: mapDailyIntentionCardRow(data) });
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
